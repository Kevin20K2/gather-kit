import {
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock3,
  Copy,
  ExternalLink,
  FileText,
  Gift,
  Home,
  Mail,
  MapPin,
  Megaphone,
  Menu,
  MessageSquare,
  PenLine,
  PlusCircle,
  Send,
  Settings,
  Sparkles,
  UserRoundCheck,
  Users,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import neighborhoodArt from './assets/neighborhood-evening.webp'
import './App.css'
import { isSupabaseConfigured, supabase } from './supabase'

type EventType =
  | 'Happy Hour'
  | 'Potluck'
  | 'Block Party'
  | 'Bowling Night'
  | 'Live Music Meetup'
  | 'Game Night'
  | 'Custom'

type PlanningStep = 'Details' | 'Invite' | 'Review'
type AppMode = 'Organizer' | 'Events' | 'Message Center' | 'Run Sheet' | 'Neighbor RSVP' | 'Settings'
type RsvpStatus = 'Yes' | 'Maybe' | 'No'
type MessageAudience = 'Everyone invited' | 'Yes and maybe' | 'Needs RSVP' | 'Supply helpers' | 'Volunteer roles'
type SaveState = 'idle' | 'saving' | 'saved' | 'error'
type EventLookupState = 'loading' | 'found' | 'missing'
type AuthMode = 'sign-in' | 'sign-up'
type EventStatus = 'draft' | 'published' | 'archived'
type EventListView = 'active' | 'history'
type AuthUser = {
  id: string
  email?: string
}
type RsvpRow = {
  id?: string
  name: string
  status: RsvpStatus
  note: string
  supply: string
  role: string
}

type MessageLogItem = {
  id?: string
  audience: MessageAudience
  body: string
  count: number
  sentAt: string
}

type MessageRow = {
  id: string
  audience: MessageAudience
  body: string
  recipient_count: number
  created_at: string
}

type RunTaskRow = {
  task_id: string
  completed: boolean
}

type EventRow = {
  slug: string
  event_type: EventType
  name: string
  date_label: string
  time_label: string
  location: string
  rsvp_deadline: string
  bring_note: string
  host_name: string
  host_phone: string
  host_email: string
  status?: EventStatus
}

type EventTemplate = {
  label: EventType
  duration: string
  location: string
  bringNote: string
  headline: string
  description: string
  roles: string[]
  supplies: string[]
  tasks: string[]
  inviteTone: string
}

const eventTemplates: EventTemplate[] = [
  {
    label: 'Happy Hour',
    duration: '5:00 PM - 7:30 PM',
    location: 'Clubhouse Patio',
    bringNote: 'Bring an appetizer or favorite beverage.',
    headline: 'Happy Hour',
    description: 'A relaxed neighborhood patio night with snacks, drinks, and easy conversation.',
    roles: ['Greeter', 'Snack table', 'Cooler setup'],
    supplies: ['Ice', 'Cups', 'Napkins', 'Appetizers'],
    tasks: ['Add event details', 'Choose date and time', 'Set location', 'Invite neighbors', 'Review and publish'],
    inviteTone: 'casual and warm',
  },
  {
    label: 'Potluck',
    duration: '6:00 PM - 8:00 PM',
    location: 'Community Room',
    bringNote: 'Tell everyone what dish you are bringing.',
    headline: 'Neighborhood Potluck',
    description: 'A shared meal where every household can bring one dish, dessert, or drink.',
    roles: ['Food table lead', 'Beverage lead', 'Cleanup lead'],
    supplies: ['Serving spoons', 'Plates', 'Labels', 'Trash bags'],
    tasks: ['Pick a theme', 'Open dish signups', 'Confirm tables', 'Send food reminder', 'Review and publish'],
    inviteTone: 'neighborly and practical',
  },
  {
    label: 'Block Party',
    duration: '4:00 PM - 8:00 PM',
    location: 'Maple Way Cul-de-sac',
    bringNote: 'Bring a chair and a shareable snack.',
    headline: 'Maple Way Block Party',
    description: 'A family-friendly outdoor gathering with food, music, and space to meet neighbors.',
    roles: ['Street setup', 'Music', 'Kids table', 'Cleanup crew'],
    supplies: ['Barricades', 'Extension cords', 'Coolers', 'Sidewalk chalk'],
    tasks: ['Confirm street plan', 'Build volunteer list', 'Create supply signup', 'Post reminders', 'Review and publish'],
    inviteTone: 'upbeat and inclusive',
  },
  {
    label: 'Bowling Night',
    duration: '6:30 PM - 8:30 PM',
    location: 'Maple Lanes',
    bringNote: 'Bring socks and RSVP early so we can reserve enough lanes.',
    headline: 'Neighborhood Bowling Night',
    description: 'A casual night out with reserved lanes, simple teams, and an easy meetup plan.',
    roles: ['Lane captain', 'Score helper', 'Snack pickup'],
    supplies: ['Lane reservation', 'Shoe sizes', 'Snack money', 'Ride shares'],
    tasks: ['Reserve lanes', 'Collect shoe sizes', 'Build lane groups', 'Send arrival reminder', 'Review and publish'],
    inviteTone: 'fun and practical',
  },
  {
    label: 'Live Music Meetup',
    duration: '7:00 PM - 10:00 PM',
    location: 'Town Green Stage',
    bringNote: 'Bring a chair or blanket for the lawn.',
    headline: 'Live Music Meetup',
    description: 'A relaxed neighborhood meetup around a local show with a simple arrival and seating plan.',
    roles: ['Meetup host', 'Seat saver', 'Photo sharer'],
    supplies: ['Blankets', 'Chairs', 'Bug spray', 'Cooler drinks'],
    tasks: ['Confirm show time', 'Pick meetup spot', 'Share parking notes', 'Send weather reminder', 'Review and publish'],
    inviteTone: 'upbeat and easygoing',
  },
  {
    label: 'Game Night',
    duration: '6:30 PM - 9:00 PM',
    location: 'Clubhouse Lounge',
    bringNote: 'Bring a favorite board game or snack.',
    headline: 'Game Night',
    description: 'A playful evening with tables for board games, card games, and easy drop-ins.',
    roles: ['Game table host', 'Snack table', 'Room reset'],
    supplies: ['Card decks', 'Score pads', 'Snacks', 'Drinks'],
    tasks: ['Pick game stations', 'Confirm room setup', 'Ask for game hosts', 'Send reminder', 'Review and publish'],
    inviteTone: 'fun and concise',
  },
  {
    label: 'Custom',
    duration: '6:00 PM - 8:00 PM',
    location: 'Neighborhood Common Area',
    bringNote: 'Add anything neighbors should bring.',
    headline: 'Custom Event',
    description: 'A flexible event plan you can shape for any neighborhood need.',
    roles: ['Host', 'Setup', 'Cleanup'],
    supplies: ['Tables', 'Chairs', 'Water'],
    tasks: ['Add event details', 'Choose date and time', 'Set location', 'Invite neighbors', 'Review and publish'],
    inviteTone: 'clear and friendly',
  },
]

const planningSteps: PlanningStep[] = ['Details', 'Invite', 'Review']

const navItems = [
  { label: 'Dashboard', icon: Home, mode: 'Organizer' as AppMode },
  { label: 'Events', icon: CalendarDays, mode: 'Events' as AppMode },
  { label: 'Neighbors', icon: Users, mode: 'Neighbor RSVP' as AppMode },
  { label: 'Messages', icon: MessageSquare, mode: 'Message Center' as AppMode },
  { label: 'Checklists', icon: ClipboardList, mode: 'Run Sheet' as AppMode },
  { label: 'Settings', icon: Settings, mode: 'Settings' as AppMode },
]

const initialRsvpRows: RsvpRow[] = [
  { name: 'Maya Chen', status: 'Yes', note: 'bringing sparkling water', supply: 'Cups', role: '' },
  { name: 'Andre Lewis', status: 'Yes', note: 'can help with setup', supply: 'Ice', role: 'Greeter' },
  { name: 'Priya Shah', status: 'Maybe', note: 'will confirm tomorrow', supply: '', role: '' },
  { name: 'Sam Rivera', status: 'Yes', note: 'bringing chips', supply: 'Appetizers', role: '' },
]

const defaultEventSlug = 'neighborhood-event'
const defaultEventDraft: EventRow = {
  slug: defaultEventSlug,
  event_type: 'Happy Hour',
  name: 'Happy Hour',
  date_label: 'Saturday, May 31, 2025',
  time_label: eventTemplates[0].duration,
  location: eventTemplates[0].location,
  rsvp_deadline: 'Wednesday, May 28, 2025',
  bring_note: eventTemplates[0].bringNote,
  host_name: 'Jordan Taylor',
  host_phone: '(555) 123-4567',
  host_email: 'jordan.taylor@email.com',
  status: 'draft',
}

function getEventSlugFromPath() {
  if (typeof window === 'undefined') return defaultEventSlug

  const match = window.location.pathname.match(/^\/e\/([^/?#]+)/)
  return match?.[1] ? decodeURIComponent(match[1]) : defaultEventSlug
}

function getEventUrl(slug: string) {
  if (typeof window === 'undefined') return `/e/${slug}`

  return `${window.location.origin}/e/${encodeURIComponent(slug)}`
}

function getDefaultHostName(email?: string) {
  return email?.split('@')[0] || defaultEventDraft.host_name
}

function updateEventUrl(slug: string, replace = false) {
  if (typeof window === 'undefined') return

  const nextPath = `/e/${encodeURIComponent(slug)}`
  const nextUrl = `${nextPath}${window.location.search}${window.location.hash}`
  if (window.location.pathname === nextPath) return

  if (replace) {
    window.history.replaceState({ eventSlug: slug }, '', nextUrl)
    return
  }

  window.history.pushState({ eventSlug: slug }, '', nextUrl)
}

function dateInputToLocalDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null

  return new Date(year, month - 1, day)
}

function localDateToDateInput(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function dateLabelToDateInput(label: string) {
  const parsedDate = new Date(label)
  if (Number.isNaN(parsedDate.getTime())) return ''

  return localDateToDateInput(parsedDate)
}

function formatDateLabelFromInput(value: string) {
  const parsedDate = dateInputToLocalDate(value)
  if (!parsedDate) return ''

  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(parsedDate)
}

function getAutoRsvpDeadlineLabel(eventDateLabel: string) {
  const eventDateInput = dateLabelToDateInput(eventDateLabel)
  const eventDate = dateInputToLocalDate(eventDateInput)
  if (!eventDate) return ''

  const deadline = new Date(eventDate)
  deadline.setDate(deadline.getDate() - 3)
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(deadline)
}

function getNextOccurrenceDateLabel(eventDateLabel: string) {
  const eventDateInput = dateLabelToDateInput(eventDateLabel)
  const eventDate = dateInputToLocalDate(eventDateInput)
  if (!eventDate) return eventDateLabel

  eventDate.setDate(eventDate.getDate() + 7)
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(eventDate)
}

function timeLabelToTimeInput(label: string) {
  const match = label.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) return ''

  let hour = Number(match[1])
  const minute = match[2]
  const meridiem = match[3].toUpperCase()

  if (meridiem === 'PM' && hour < 12) hour += 12
  if (meridiem === 'AM' && hour === 12) hour = 0

  return `${String(hour).padStart(2, '0')}:${minute}`
}

function timeRangeToInputs(label: string) {
  const [startLabel = '', endLabel = ''] = label.split(' - ')
  return {
    start: timeLabelToTimeInput(startLabel),
    end: timeLabelToTimeInput(endLabel),
  }
}

function formatTimeFromInput(value: string) {
  const [hourValue, minute = '00'] = value.split(':')
  const hour24 = Number(hourValue)
  if (Number.isNaN(hour24)) return ''

  const meridiem = hour24 >= 12 ? 'PM' : 'AM'
  const hour12 = hour24 % 12 || 12
  return `${hour12}:${minute} ${meridiem}`
}

function formatTimeRangeFromInputs(start: string, end: string) {
  if (!start || !end) return ''

  return `${formatTimeFromInput(start)} - ${formatTimeFromInput(end)}`
}

function addHoursToTimeInput(value: string, hours: number) {
  const [hourValue, minuteValue = '0'] = value.split(':')
  const hour = Number(hourValue)
  const minute = Number(minuteValue)
  if (Number.isNaN(hour) || Number.isNaN(minute)) return ''

  const totalMinutes = (hour * 60 + minute + hours * 60) % (24 * 60)
  const normalizedMinutes = totalMinutes < 0 ? totalMinutes + 24 * 60 : totalMinutes
  const nextHour = Math.floor(normalizedMinutes / 60)
  const nextMinute = normalizedMinutes % 60
  return `${String(nextHour).padStart(2, '0')}:${String(nextMinute).padStart(2, '0')}`
}

function isPublicEventPath() {
  return typeof window !== 'undefined' && window.location.pathname.startsWith('/e/')
}

function getInitialMode(): AppMode {
  if (isPublicEventPath()) return 'Neighbor RSVP'
  return 'Events'
}

const eventSelectColumns =
  'slug,event_type,name,date_label,time_label,location,rsvp_deadline,bring_note,host_name,host_phone,host_email,status'

const fallbackEventSelectColumns =
  'slug,event_type,name,date_label,time_label,location,rsvp_deadline,bring_note,host_name,host_phone,host_email'

function isMissingStatusColumn(error: { message?: string } | null) {
  return Boolean(error?.message?.toLowerCase().includes('status'))
}

function eventRowWithoutStatus(row: EventRow) {
  return {
    slug: row.slug,
    event_type: row.event_type,
    name: row.name,
    date_label: row.date_label,
    time_label: row.time_label,
    location: row.location,
    rsvp_deadline: row.rsvp_deadline,
    bring_note: row.bring_note,
    host_name: row.host_name,
    host_phone: row.host_phone,
    host_email: row.host_email,
  }
}

function navLabelForInitialMode(mode: AppMode) {
  if (mode === 'Events') return 'Events'
  if (mode === 'Message Center') return 'Messages'
  if (mode === 'Run Sheet') return 'Checklists'
  if (mode === 'Neighbor RSVP') return 'Neighbors'
  if (mode === 'Settings') return 'Settings'
  return 'Dashboard'
}

function App() {
  const [appMode, setAppMode] = useState<AppMode>(getInitialMode)
  const [activeNavLabel, setActiveNavLabel] = useState(() => navLabelForInitialMode(getInitialMode()))
  const [selectedEventSlug, setSelectedEventSlug] = useState(getEventSlugFromPath)
  const [eventRows, setEventRows] = useState<EventRow[]>([defaultEventDraft])
  const [eventLookupState, setEventLookupState] = useState<EventLookupState>('loading')
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [authMode, setAuthMode] = useState<AuthMode>('sign-in')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authStatus, setAuthStatus] = useState(isSupabaseConfigured ? 'Checking your session...' : 'Demo mode')
  const [authNotice, setAuthNotice] = useState('')
  const [authSending, setAuthSending] = useState(false)
  const authCheckVersion = useRef(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [localDataReady, setLocalDataReady] = useState(isSupabaseConfigured)
  const [activeStep, setActiveStep] = useState<PlanningStep>('Details')
  const [eventType, setEventType] = useState<EventType>(defaultEventDraft.event_type)
  const [eventName, setEventName] = useState(defaultEventDraft.name)
  const [date, setDate] = useState(defaultEventDraft.date_label)
  const [time, setTime] = useState(defaultEventDraft.time_label)
  const [eventStartTime, setEventStartTime] = useState(() => timeRangeToInputs(defaultEventDraft.time_label).start)
  const [eventEndTime, setEventEndTime] = useState(() => timeRangeToInputs(defaultEventDraft.time_label).end)
  const [location, setLocation] = useState(defaultEventDraft.location)
  const [rsvpDate, setRsvpDate] = useState(defaultEventDraft.rsvp_deadline)
  const [rsvpDeadlineTouched, setRsvpDeadlineTouched] = useState(false)
  const [bringNote, setBringNote] = useState(defaultEventDraft.bring_note)
  const [hostName, setHostName] = useState(defaultEventDraft.host_name)
  const [hostEmail, setHostEmail] = useState(defaultEventDraft.host_email)
  const [hostPhone, setHostPhone] = useState(defaultEventDraft.host_phone)
  const [hostProfileName, setHostProfileName] = useState(defaultEventDraft.host_name)
  const [hostProfilePhone, setHostProfilePhone] = useState(defaultEventDraft.host_phone)
  const [profileSaveStatus, setProfileSaveStatus] = useState('Profile ready')
  const [profileSaveState, setProfileSaveState] = useState<SaveState>('idle')
  const [eventStatus, setEventStatus] = useState<EventStatus>(defaultEventDraft.status ?? 'draft')
  const [eventSaveStatus, setEventSaveStatus] = useState('Ready to save')
  const [eventSaveState, setEventSaveState] = useState<SaveState>('idle')
  const [selectedRoles, setSelectedRoles] = useState(['Greeter', 'Snack table'])
  const [copiedLabel, setCopiedLabel] = useState('')
  const [neighborName, setNeighborName] = useState('')
  const [rsvpStatus, setRsvpStatus] = useState<RsvpStatus>('Yes')
  const [pledgedSupply, setPledgedSupply] = useState('')
  const [pledgedRole, setPledgedRole] = useState('')
  const [neighborNote, setNeighborNote] = useState('')
  const [submittedMessage, setSubmittedMessage] = useState('')
  const [messageAudience, setMessageAudience] = useState<MessageAudience>('Yes and maybe')
  const [messageBody, setMessageBody] = useState('')
  const [messageLog, setMessageLog] = useState<MessageLogItem[]>([])
  const [checkedRunTasks, setCheckedRunTasks] = useState<string[]>(['confirm-location', 'post-welcome-sign'])
  const [rsvpRows, setRsvpRows] = useState<RsvpRow[]>(initialRsvpRows)
  const [eventListView, setEventListView] = useState<EventListView>('active')

  const template = useMemo(
    () => eventTemplates.find((item) => item.label === eventType) ?? eventTemplates[0],
    [eventType],
  )
  const activeEventRows = eventRows.filter((row) => (row.status ?? 'draft') !== 'archived')
  const archivedEventRows = eventRows.filter((row) => row.status === 'archived')
  const visibleEventRows = eventListView === 'active' ? activeEventRows : archivedEventRows

  const completeTasks = template.tasks.slice(0, 3)
  const openTasks = template.tasks.slice(3)
  const inviteDraft = `${eventName} is happening ${date} from ${time} at ${location}. ${template.description} RSVP by ${rsvpDate}. ${bringNote}`
  const reminderDraft = `Quick reminder: ${eventName} is coming up at ${location}. ${bringNote} Reply with questions or update your RSVP before ${rsvpDate}.`
  const flyerDraft = `${eventName}\n${date}\n${time}\n${location}\n${bringNote}`
  const rsvpLink = getEventUrl(selectedEventSlug)
  const readinessScore = Math.round((completeTasks.length / template.tasks.length) * 100)
  const yesCount = rsvpRows.filter((row) => row.status === 'Yes').length
  const maybeCount = rsvpRows.filter((row) => row.status === 'Maybe').length
  const attendingCount = yesCount + maybeCount
  const claimedSupplies = new Set(rsvpRows.filter((row) => row.status !== 'No').map((row) => row.supply).filter(Boolean))
  const stillNeededSupplies = template.supplies.filter(
    (supply) => !claimedSupplies.has(supply) && supply !== pledgedSupply,
  )
  const noResponseCount = Math.max(0, 18 - rsvpRows.length)
  const audienceCounts: Record<MessageAudience, number> = {
    'Everyone invited': rsvpRows.length + noResponseCount,
    'Yes and maybe': attendingCount,
    'Needs RSVP': noResponseCount,
    'Supply helpers': rsvpRows.filter((row) => row.supply).length,
    'Volunteer roles': rsvpRows.filter((row) => row.role).length,
  }
  const assignedRoles = template.roles.map((role) => ({
    role,
    owner: rsvpRows.find((row) => row.role === role)?.name ?? '',
  }))
  const missingRoles = assignedRoles.filter((item) => !item.owner)
  const runSheetTasks = [
    { id: 'confirm-location', time: '3:30 PM', task: `Confirm access to ${location}`, owner: hostName },
    { id: 'setup-tables', time: '4:15 PM', task: 'Set up tables, chairs, and supply station', owner: assignedRoles[0]?.owner || hostName },
    { id: 'post-welcome-sign', time: '4:30 PM', task: 'Post welcome sign and RSVP QR code', owner: hostName },
    { id: 'supply-check', time: '4:45 PM', task: 'Check off promised supplies as they arrive', owner: assignedRoles[1]?.owner || 'Supply helper' },
    { id: 'greet-neighbors', time: time.split(' - ')[0], task: 'Greet neighbors and point out signup table', owner: assignedRoles[0]?.owner || 'Greeter needed' },
    { id: 'last-call', time: '7:10 PM', task: 'Send cleanup and final-call reminder', owner: hostName },
    { id: 'cleanup', time: '7:30 PM', task: 'Reset space, collect trash, and pack remaining supplies', owner: assignedRoles.at(-1)?.owner || 'Cleanup helper needed' },
  ]
  const openRunSheetTasks = runSheetTasks.filter((task) => !checkedRunTasks.includes(task.id))
  const suggestedMessage =
    messageAudience === 'Needs RSVP'
      ? `Hi neighbor, RSVP is due ${rsvpDate} for ${eventName}. We would love to know if you can make it.`
      : messageAudience === 'Supply helpers'
        ? `Thank you for helping with supplies for ${eventName}. Please bring your item to ${location} by ${time.split(' - ')[0]}.`
        : messageAudience === 'Volunteer roles'
          ? `Thank you for volunteering for ${eventName}. Please arrive 20 minutes early so we can get set up together.`
          : `Quick update for ${eventName}: we are set for ${date} at ${location}. ${bringNote}`
  const isHostSignedIn = !isSupabaseConfigured || Boolean(authUser)
  const isHostMode = appMode !== 'Neighbor RSVP'
  const isPublicInviteMode = isPublicEventPath() && appMode === 'Neighbor RSVP'
  const shouldShowAuthGate = isHostMode && !isHostSignedIn
  const normalizedSignedInEmail = authUser?.email?.trim().toLowerCase() ?? ''
  const normalizedEventHostEmail = hostEmail.trim().toLowerCase()
  const isDifferentHostEvent = Boolean(
    isSupabaseConfigured &&
      authUser?.email &&
      normalizedEventHostEmail &&
      normalizedEventHostEmail !== normalizedSignedInEmail,
  )
  const shouldShowOwnershipGate = isHostMode && appMode !== 'Events' && isDifferentHostEvent
  const hostEmailLabel = authUser?.email ?? 'Host'
  const greetingName = authUser?.email ? authUser.email.split('@')[0] : 'there'
  const topbarProfileName = hostProfileName.trim() || getDefaultHostName(authUser?.email)
  const profileInitials = topbarProfileName.slice(0, 2).toUpperCase()
  const topbarTitle = authUser ? `Hello, ${greetingName}` : 'Welcome'
  const topbarSubtitle = authUser
    ? 'Here is what is happening in your neighborhood.'
    : 'Sign in to manage events, or open a public RSVP link.'
  const inviteTopbarTitle = "You're invited"
  const inviteTopbarSubtitle = `${eventName} / ${date} / ${location}`
  const authGateTitle =
    authMode === 'sign-up'
      ? 'Create your host account.'
      : appMode === 'Events'
        ? 'Sign in to manage your events.'
        : 'Sign in to manage this event.'
  const authGateDescription =
    appMode === 'Events'
      ? 'Create event plans, RSVP links, message drafts, and day-of run sheets from one host dashboard.'
      : 'Neighbors can still RSVP from the public event link. Organizer tools require a host account.'
  const sidebarStatus = authUser
    ? {
        title: activeEventRows.length === 1 ? '1 active event' : `${activeEventRows.length} active events`,
        body:
          activeEventRows.length > 0
            ? 'Open an event to manage invites, reminders, and day-of tasks.'
            : 'Create your first event draft from the Events dashboard.',
      }
    : {
        title: 'Host tools ready',
        body: 'Sign in to create event drafts, RSVP links, and run sheets.',
      }

  useEffect(() => {
    if (!isPublicEventPath()) return

    updateEventUrl(selectedEventSlug, true)
  }, [selectedEventSlug])

  useEffect(() => {
    if (!isPublicEventPath()) return

    setAppMode('Neighbor RSVP')
    setActiveNavLabel('Neighbors')
  }, [])

  useEffect(() => {
    function handlePopState() {
      setSelectedEventSlug(getEventSlugFromPath())
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    if (!supabase) return

    let isMounted = true
    const client = supabase
    const checkVersion = ++authCheckVersion.current

    function applySignedInUser(user: { id: string; email?: string } | null) {
      setAuthUser(user ? { id: user.id, email: user.email } : null)
      setAuthEmail(user?.email ?? '')
      setAuthStatus(user?.email ? `Signed in as ${user.email}` : 'Host sign-in required')
      if (user?.email) setAuthNotice('')

      if (user?.email && hostEmail === defaultEventDraft.host_email) {
        setHostEmail(user.email)
      }
    }

    async function loadSession() {
      const { data } = await client.auth.getSession()
      if (!isMounted || checkVersion !== authCheckVersion.current) return

      applySignedInUser(data.session?.user ?? null)
    }

    loadSession()

    const { data } = client.auth.onAuthStateChange((_event, session) => {
      authCheckVersion.current += 1
      applySignedInUser(session?.user ?? null)
    })

    return () => {
      isMounted = false
      data.subscription.unsubscribe()
    }
  }, [hostEmail])

  useEffect(() => {
    if (!supabase || !authUser?.email) {
      setHostProfileName(defaultEventDraft.host_name)
      setHostProfilePhone(defaultEventDraft.host_phone)
      setProfileSaveStatus('Profile ready')
      setProfileSaveState('idle')
      return
    }

    let isMounted = true
    const client = supabase
    const signedInEmail = authUser.email

    async function loadHostProfile() {
      setProfileSaveStatus('Loading host profile...')
      setProfileSaveState('saving')

      const { data, error } = await client
        .from('gatherkit_hosts')
        .select('display_name,email,phone')
        .eq('email', signedInEmail)
        .maybeSingle()

      if (!isMounted) return

      if (error) {
        setHostProfileName(getDefaultHostName(signedInEmail))
        setHostProfilePhone('')
        setProfileSaveStatus(`Profile load error: ${error.message}`)
        setProfileSaveState('error')
        return
      }

      const nextName = data?.display_name || getDefaultHostName(signedInEmail)
      const nextPhone = data?.phone || ''
      setHostProfileName(nextName)
      setHostProfilePhone(nextPhone)
      setProfileSaveStatus(data ? 'Profile loaded' : 'Profile ready')
      setProfileSaveState(data ? 'saved' : 'idle')

      if (hostEmail === defaultEventDraft.host_email) setHostEmail(signedInEmail)
      if (hostName === defaultEventDraft.host_name) setHostName(nextName)
      if (hostPhone === defaultEventDraft.host_phone) setHostPhone(nextPhone || defaultEventDraft.host_phone)
    }

    loadHostProfile()

    return () => {
      isMounted = false
    }
  }, [authUser?.email])

  useEffect(() => {
    if (!isSupabaseConfigured && localDataReady) {
      window.localStorage.setItem(localStorageKey('rsvps'), JSON.stringify(rsvpRows))
    }
  }, [localDataReady, rsvpRows, selectedEventSlug])

  useEffect(() => {
    if (!isSupabaseConfigured && localDataReady) {
      window.localStorage.setItem(localStorageKey('run-tasks'), JSON.stringify(checkedRunTasks))
    }
  }, [checkedRunTasks, localDataReady, selectedEventSlug])

  useEffect(() => {
    if (!isSupabaseConfigured && localDataReady) {
      window.localStorage.setItem(localStorageKey('message-log'), JSON.stringify(messageLog))
    }
  }, [localDataReady, messageLog, selectedEventSlug])

  useEffect(() => {
    if (supabase) return

    try {
      const storedEvents = window.localStorage.getItem('gatherkit-events')
      const parsedEvents = storedEvents ? (JSON.parse(storedEvents) as EventRow[]) : []
      const nextEvents = parsedEvents.length > 0 ? parsedEvents : [defaultEventDraft]
      const selectedEvent = nextEvents.find((row) => row.slug === selectedEventSlug)

      setEventRows(nextEvents)
      if (selectedEvent) {
        applyEventRow(selectedEvent)
        setEventLookupState('found')
      } else {
        setEventLookupState('missing')
      }
      setEventSaveStatus('Loaded local events')
      setEventSaveState('saved')
      setLocalDataReady(true)
    } catch {
      setEventRows([defaultEventDraft])
      applyEventRow(defaultEventDraft)
      setEventLookupState('found')
      setEventSaveStatus('Local events could not be loaded')
      setEventSaveState('error')
      setLocalDataReady(true)
    }
  }, [])

  useEffect(() => {
    if (supabase || !localDataReady) return

    const selectedEvent = eventRows.find((row) => row.slug === selectedEventSlug)
    if (selectedEvent) {
      applyEventRow(selectedEvent)
      setEventLookupState('found')
    } else {
      setEventLookupState('missing')
    }

    setRsvpRows(readLocalList<RsvpRow>(localStorageKey('rsvps'), selectedEventSlug === defaultEventSlug ? initialRsvpRows : []))
    setCheckedRunTasks(readLocalList<string>(localStorageKey('run-tasks'), []))
    setMessageLog(readLocalList<MessageLogItem>(localStorageKey('message-log'), []))
  }, [eventRows, localDataReady, selectedEventSlug])

  useEffect(() => {
    if (!supabase) return
    if (!authUser?.email) {
      setEventRows([defaultEventDraft])
      return
    }

    let isMounted = true
    const client = supabase
    const hostEmailFilter = authUser.email

    async function loadEvents() {
      const result = await client
        .from('gatherkit_events')
        .select(eventSelectColumns)
        .eq('host_email', hostEmailFilter)
        .order('updated_at', { ascending: false })
      let data: unknown = result.data
      let error = result.error

      if (isMissingStatusColumn(error)) {
        const fallbackResult = await client
          .from('gatherkit_events')
          .select(fallbackEventSelectColumns)
          .eq('host_email', hostEmailFilter)
          .order('updated_at', { ascending: false })
        data = fallbackResult.data
        error = fallbackResult.error
      }

      if (!isMounted) return

      if (error) {
        setEventSaveStatus(`Could not load your events: ${error.message}`)
        setEventSaveState('error')
        return
      }

      const rows = data as EventRow[]
      if (rows.length > 0) {
        setEventRows(rows)
        return
      }

      setEventRows([])
      if (selectedEventSlug === defaultEventSlug) {
        await saveEventDetails('Event draft created')
      }
    }

    loadEvents()

    const channel = client
      .channel('event-list')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gatherkit_events' },
        () => {
          loadEvents()
        },
      )
      .subscribe()

    return () => {
      isMounted = false
      client.removeChannel(channel)
    }
  }, [authUser?.email])

  useEffect(() => {
    if (!supabase) return

    let isMounted = true
    const client = supabase

    async function loadEvent() {
      setEventLookupState('loading')

      const result = await client
        .from('gatherkit_events')
        .select(eventSelectColumns)
        .eq('slug', selectedEventSlug)
        .maybeSingle()
      let data: unknown = result.data
      let error = result.error

      if (isMissingStatusColumn(error)) {
        const fallbackResult = await client
          .from('gatherkit_events')
          .select(fallbackEventSelectColumns)
          .eq('slug', selectedEventSlug)
          .maybeSingle()
        data = fallbackResult.data
        error = fallbackResult.error
      }

      if (!isMounted) return

      if (error) {
        setEventSaveStatus(`Could not load this event: ${error.message}`)
        setEventSaveState('error')
        return
      }

      if (data) {
        applyEventRow(data as EventRow)
        setEventSaveStatus('Event loaded')
        setEventSaveState('saved')
        setEventLookupState('found')
        return
      }

      setEventLookupState('missing')
      setRsvpRows([])
      setCheckedRunTasks([])
      setMessageLog([])
      setEventSaveStatus('No event found for this link')
      setEventSaveState('idle')
    }

    loadEvent()

    const channel = client
      .channel(`event-details-${selectedEventSlug}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gatherkit_events', filter: `slug=eq.${selectedEventSlug}` },
        (payload) => {
          if (payload.new) {
            applyEventRow(payload.new as EventRow)
            setEventSaveStatus('Event updated live')
            setEventSaveState('saved')
          }
        },
      )
      .subscribe()

    return () => {
      isMounted = false
      client.removeChannel(channel)
    }
  }, [authUser, selectedEventSlug])

  useEffect(() => {
    if (!supabase) return
    if (!authUser) {
      setCheckedRunTasks([])
      return
    }

    let isMounted = true
    const client = supabase

    async function loadRsvps() {
      const { data, error } = await client
        .from('gatherkit_event_rsvps')
        .select('id,name,status,note,supply,role')
        .eq('event_slug', selectedEventSlug)
        .order('updated_at', { ascending: false })

      if (!isMounted) return

      if (error) {
        setSubmittedMessage(`Could not load RSVPs: ${error.message}`)
        return
      }

      setRsvpRows(data.length > 0 ? (data as RsvpRow[]) : selectedEventSlug === defaultEventSlug ? initialRsvpRows : [])
    }

    loadRsvps()

    const channel = client
      .channel(`event-rsvps-${selectedEventSlug}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gatherkit_event_rsvps', filter: `event_slug=eq.${selectedEventSlug}` },
        () => {
          loadRsvps()
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setSubmittedMessage('')
      })

    return () => {
      isMounted = false
      client.removeChannel(channel)
    }
  }, [authUser, selectedEventSlug])

  useEffect(() => {
    if (!supabase) return

    let isMounted = true
    const client = supabase

    async function loadMessages() {
      const { data, error } = await client
        .from('gatherkit_event_messages')
        .select('id,audience,body,recipient_count,created_at')
        .eq('event_slug', selectedEventSlug)
        .order('created_at', { ascending: false })
        .limit(20)

      if (!isMounted) return

      if (error) {
        setCopiedLabel(`Could not load messages: ${error.message}`)
        return
      }

      setMessageLog(
        (data as MessageRow[]).map((row) => ({
          id: row.id,
          audience: row.audience,
          body: row.body,
          count: row.recipient_count,
          sentAt: formatMessageTime(row.created_at),
        })),
      )
    }

    loadMessages()

    const channel = client
      .channel(`event-messages-${selectedEventSlug}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gatherkit_event_messages', filter: `event_slug=eq.${selectedEventSlug}` },
        () => {
          loadMessages()
        },
      )
      .subscribe()

    return () => {
      isMounted = false
      client.removeChannel(channel)
    }
  }, [selectedEventSlug])

  useEffect(() => {
    if (!supabase) return

    let isMounted = true
    const client = supabase

    async function loadRunTasks() {
      const { data, error } = await client
        .from('gatherkit_event_tasks')
        .select('task_id,completed')
        .eq('event_slug', selectedEventSlug)

      if (!isMounted) return

      if (error) {
        setCopiedLabel(`Could not load run sheet: ${error.message}`)
        return
      }

      const completedIds = (data as RunTaskRow[]).filter((row) => row.completed).map((row) => row.task_id)
      setCheckedRunTasks(completedIds)
    }

    loadRunTasks()

    const channel = client
      .channel(`event-run-tasks-${selectedEventSlug}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gatherkit_event_tasks', filter: `event_slug=eq.${selectedEventSlug}` },
        () => {
          loadRunTasks()
        },
      )
      .subscribe()

    return () => {
      isMounted = false
      client.removeChannel(channel)
    }
  }, [selectedEventSlug])

  useEffect(() => {
    setMessageBody(suggestedMessage)
  }, [suggestedMessage])

  function handleTypeChange(nextType: EventType) {
    const nextTemplate = eventTemplates.find((item) => item.label === nextType) ?? eventTemplates[0]
    const templateTime = timeRangeToInputs(nextTemplate.duration)
    setEventType(nextType)
    setEventName(nextTemplate.headline)
    setTime(nextTemplate.duration)
    setEventStartTime(templateTime.start)
    setEventEndTime(templateTime.end)
    setLocation(nextTemplate.location)
    setBringNote(nextTemplate.bringNote)
    setSelectedRoles(nextTemplate.roles.slice(0, 2))
    setPledgedSupply(nextTemplate.supplies[0])
    setPledgedRole('')
  }

  function handleEventDateChange(value: string) {
    const nextDateLabel = formatDateLabelFromInput(value)
    if (!nextDateLabel) return

    setDate(nextDateLabel)
    if (!rsvpDeadlineTouched) {
      setRsvpDate(getAutoRsvpDeadlineLabel(nextDateLabel))
    }
  }

  function handleRsvpDateChange(value: string) {
    const nextRsvpDateLabel = formatDateLabelFromInput(value)
    if (!nextRsvpDateLabel) return

    setRsvpDeadlineTouched(true)
    setRsvpDate(nextRsvpDateLabel)
  }

  function handleStartTimeChange(value: string) {
    const nextEndTime = !eventEndTime || value >= eventEndTime ? addHoursToTimeInput(value, 2) : eventEndTime
    setEventStartTime(value)
    setEventEndTime(nextEndTime)
    setTime(formatTimeRangeFromInputs(value, nextEndTime) || time)
  }

  function handleEndTimeChange(value: string) {
    if (!eventStartTime) {
      setEventEndTime(value)
      setTime(formatTimeRangeFromInputs(eventStartTime, value) || time)
      return
    }

    const nextEndTime = value <= eventStartTime ? addHoursToTimeInput(eventStartTime, 2) : value
    setEventEndTime(nextEndTime)
    setTime(formatTimeRangeFromInputs(eventStartTime, nextEndTime) || time)
  }

  function applyEventRow(row: EventRow) {
    const supportedType = eventTemplates.some((item) => item.label === row.event_type)
      ? row.event_type
      : defaultEventDraft.event_type
    const nextDateLabel = row.date_label || defaultEventDraft.date_label
    const nextRsvpDateLabel = row.rsvp_deadline || defaultEventDraft.rsvp_deadline

    setEventType(supportedType)
    setEventName(row.name || defaultEventDraft.name)
    setDate(nextDateLabel)
    setTime(row.time_label || defaultEventDraft.time_label)
    setEventStartTime(timeRangeToInputs(row.time_label || defaultEventDraft.time_label).start)
    setEventEndTime(timeRangeToInputs(row.time_label || defaultEventDraft.time_label).end)
    setLocation(row.location || defaultEventDraft.location)
    setRsvpDate(nextRsvpDateLabel)
    setRsvpDeadlineTouched(nextRsvpDateLabel !== getAutoRsvpDeadlineLabel(nextDateLabel))
    setBringNote(row.bring_note || defaultEventDraft.bring_note)
    setHostName(row.host_name || defaultEventDraft.host_name)
    setHostPhone(row.host_phone || defaultEventDraft.host_phone)
    setHostEmail(row.host_email || defaultEventDraft.host_email)
    setEventStatus(row.status ?? 'draft')
  }

  function buildEventDraft(status: EventStatus = eventStatus): EventRow {
    return {
      slug: selectedEventSlug,
      event_type: eventType,
      name: eventName.trim() || defaultEventDraft.name,
      date_label: date.trim() || defaultEventDraft.date_label,
      time_label: time.trim() || defaultEventDraft.time_label,
      location: location.trim() || defaultEventDraft.location,
      rsvp_deadline: rsvpDate.trim() || defaultEventDraft.rsvp_deadline,
      bring_note: bringNote.trim() || defaultEventDraft.bring_note,
      host_name: hostName.trim() || defaultEventDraft.host_name,
      host_phone: hostPhone.trim() || defaultEventDraft.host_phone,
      host_email: authUser?.email ?? (hostEmail.trim() || defaultEventDraft.host_email),
      status,
    }
  }

  function setOwnershipWarning(action: string) {
    setEventSaveState('error')
    setEventSaveStatus(
      `This event belongs to ${hostEmail}. You are signed in as ${authUser?.email}. Create your own copy to ${action}.`,
    )
  }

  async function saveEventDetails(successMessage = 'Event draft saved', nextStatus: EventStatus = eventStatus) {
    if (isSupabaseConfigured && !authUser) {
      setAuthStatus('Sign in as a host to save event drafts.')
      return false
    }

    if (isDifferentHostEvent) {
      setOwnershipWarning('edit it')
      return false
    }

    const eventDraft = buildEventDraft(nextStatus)
    setEventSaveState('saving')
    setEventSaveStatus('Saving event draft...')

    if (!supabase) {
      setEventRows((rows) => {
        const nextRows = mergeEventRows(rows, eventDraft)
        window.localStorage.setItem('gatherkit-events', JSON.stringify(nextRows))
        return nextRows
      })
      setEventSaveStatus('Event draft saved locally')
      setEventSaveState('saved')
      return true
    }

    const { data: host, error: hostError } = await supabase
      .from('gatherkit_hosts')
      .upsert(
        {
          user_id: authUser?.id,
          display_name: hostProfileName.trim() || eventDraft.host_name,
          email: eventDraft.host_email,
          phone: hostProfilePhone.trim() || eventDraft.host_phone,
        },
        { onConflict: 'email' },
      )
      .select('id')
      .single()

    if (hostError) {
      setEventSaveStatus(`Host sync error: ${hostError.message}`)
      setEventSaveState('error')
      return false
    }

    let { error } = await supabase.from('gatherkit_events').upsert(
      {
        host_id: host.id,
        ...eventDraft,
      },
      { onConflict: 'slug' },
    )

    if (isMissingStatusColumn(error)) {
      const fallbackResult = await supabase.from('gatherkit_events').upsert(
        {
          host_id: host.id,
          ...eventRowWithoutStatus(eventDraft),
        },
        { onConflict: 'slug' },
      )
      error = fallbackResult.error
    }

    if (error) {
      setEventSaveStatus(`Event sync error: ${error.message}`)
      setEventSaveState('error')
      return false
    }

    setEventSaveStatus(successMessage)
    setEventSaveState('saved')
    setEventStatus(nextStatus)
    setEventRows((rows) => mergeEventRows(rows, eventDraft))
    return true
  }

  async function createNewEvent(slugOverride?: string) {
    if (isSupabaseConfigured && !authUser) {
      setAuthStatus('Sign in as a host to create events.')
      setAppMode('Organizer')
      setActiveNavLabel('Dashboard')
      return
    }

    const slug = slugOverride ?? `event-${Date.now().toString(36)}`
    const draft = buildStarterEvent(slug)

    updateEventUrl(slug)
    setSelectedEventSlug(slug)
    setEventRows((rows) => [draft, ...rows])
    setEventLookupState('found')
    applyEventRow(draft)
    setRsvpRows([])
    setCheckedRunTasks([])
    setMessageLog([])
    setActiveStep('Details')
    setActiveNavLabel('Dashboard')
    setAppMode('Organizer')
    setEventSaveState('saving')
    setEventSaveStatus(slugOverride ? 'Creating event from link...' : 'Creating new event...')

    if (!supabase) {
      const nextRows = [draft, ...eventRows]
      setEventRows(nextRows)
      window.localStorage.setItem('gatherkit-events', JSON.stringify(nextRows))
      setEventLookupState('found')
      setEventSaveState('saved')
      setEventSaveStatus('New event draft created locally')
      return
    }

    const { data: host, error: hostError } = await supabase
      .from('gatherkit_hosts')
      .upsert(
        {
          user_id: authUser?.id,
          display_name: hostProfileName.trim() || draft.host_name,
          email: draft.host_email,
          phone: hostProfilePhone.trim() || draft.host_phone,
        },
        { onConflict: 'email' },
      )
      .select('id')
      .single()

    if (hostError) {
      setEventSaveState('error')
      setEventSaveStatus(`Host sync error: ${hostError.message}`)
      return
    }

    let { error } = await supabase.from('gatherkit_events').insert({
      host_id: host.id,
      ...draft,
    })

    if (isMissingStatusColumn(error)) {
      const fallbackResult = await supabase.from('gatherkit_events').insert({
        host_id: host.id,
        ...eventRowWithoutStatus(draft),
      })
      error = fallbackResult.error
    }

    if (error) {
      setEventSaveState('error')
      setEventSaveStatus(`Event sync error: ${error.message}`)
      return
    }

    setEventSaveState('saved')
    setEventStatus(draft.status ?? 'draft')
    setEventLookupState('found')
    setEventSaveStatus('New event draft created')
  }

  async function createOwnedCopyOfCurrentEvent() {
    if (isSupabaseConfigured && !authUser?.email) {
      setAuthStatus('Sign in as a host to copy this event.')
      setAppMode('Organizer')
      setActiveNavLabel('Dashboard')
      return
    }

    const safeBaseSlug = selectedEventSlug
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'event'
    const slug = `${safeBaseSlug}-copy-${Date.now().toString(36)}`
    const draft: EventRow = {
      ...buildEventDraft(),
      slug,
      name: eventName.trim() || defaultEventDraft.name,
      host_email: authUser?.email ?? (hostEmail.trim() || defaultEventDraft.host_email),
      status: 'draft',
    }

    updateEventUrl(slug)
    setSelectedEventSlug(slug)
    setEventRows((rows) => [draft, ...rows])
    applyEventRow(draft)
    setRsvpRows([])
    setCheckedRunTasks([])
    setMessageLog([])
    setEventLookupState('found')
    setActiveStep('Details')
    setActiveNavLabel('Dashboard')
    setAppMode('Organizer')
    setEventSaveState('saving')
    setEventSaveStatus('Creating your host-owned copy...')

    if (!supabase) {
      const nextRows = [draft, ...eventRows]
      setEventRows(nextRows)
      window.localStorage.setItem('gatherkit-events', JSON.stringify(nextRows))
      setEventSaveState('saved')
      setEventSaveStatus('Copied to your account locally')
      return
    }

    const { data: host, error: hostError } = await supabase
      .from('gatherkit_hosts')
      .upsert(
        {
          user_id: authUser?.id,
          display_name: hostProfileName.trim() || draft.host_name,
          email: draft.host_email,
          phone: hostProfilePhone.trim() || draft.host_phone,
        },
        { onConflict: 'email' },
      )
      .select('id')
      .single()

    if (hostError) {
      setEventSaveState('error')
      setEventSaveStatus(`Host sync error: ${hostError.message}`)
      return
    }

    let { error } = await supabase.from('gatherkit_events').insert({
      host_id: host.id,
      ...draft,
    })

    if (isMissingStatusColumn(error)) {
      const fallbackResult = await supabase.from('gatherkit_events').insert({
        host_id: host.id,
        ...eventRowWithoutStatus(draft),
      })
      error = fallbackResult.error
    }

    if (error) {
      setEventSaveState('error')
      setEventSaveStatus(`Event copy error: ${error.message}`)
      return
    }

    setEventSaveState('saved')
    setEventStatus('draft')
    setEventSaveStatus('Copied to your account')
  }

  async function duplicateEvent(sourceEvent: EventRow = buildEventDraft()) {
    if (isSupabaseConfigured && !authUser?.email) {
      setAuthStatus('Sign in as a host to duplicate events.')
      setAppMode('Events')
      setActiveNavLabel('Events')
      return
    }

    const nextDateLabel = getNextOccurrenceDateLabel(sourceEvent.date_label)
    const nextRsvpDeadline = getAutoRsvpDeadlineLabel(nextDateLabel) || sourceEvent.rsvp_deadline
    const safeBaseSlug = sourceEvent.slug
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'event'
    const slug = `${safeBaseSlug}-next-${Date.now().toString(36)}`
    const draft: EventRow = {
      ...sourceEvent,
      slug,
      name: `${sourceEvent.name} Copy`,
      date_label: nextDateLabel,
      rsvp_deadline: nextRsvpDeadline,
      host_email: authUser?.email ?? sourceEvent.host_email,
      status: 'draft',
    }

    updateEventUrl(slug)
    setSelectedEventSlug(slug)
    setEventRows((rows) => [draft, ...rows])
    applyEventRow(draft)
    setRsvpRows([])
    setCheckedRunTasks([])
    setMessageLog([])
    setEventLookupState('found')
    setActiveStep('Details')
    setActiveNavLabel('Dashboard')
    setAppMode('Organizer')
    setEventSaveState('saving')
    setEventSaveStatus('Duplicating event...')

    if (!supabase) {
      const nextRows = [draft, ...eventRows]
      setEventRows(nextRows)
      window.localStorage.setItem('gatherkit-events', JSON.stringify(nextRows))
      setEventSaveState('saved')
      setEventSaveStatus('Event duplicated locally')
      return
    }

    const { data: host, error: hostError } = await supabase
      .from('gatherkit_hosts')
      .upsert(
        {
          user_id: authUser?.id,
          display_name: hostProfileName.trim() || draft.host_name,
          email: draft.host_email,
          phone: hostProfilePhone.trim() || draft.host_phone,
        },
        { onConflict: 'email' },
      )
      .select('id')
      .single()

    if (hostError) {
      setEventSaveState('error')
      setEventSaveStatus(`Host sync error: ${hostError.message}`)
      return
    }

    let { error } = await supabase.from('gatherkit_events').insert({
      host_id: host.id,
      ...draft,
    })

    if (isMissingStatusColumn(error)) {
      const fallbackResult = await supabase.from('gatherkit_events').insert({
        host_id: host.id,
        ...eventRowWithoutStatus(draft),
      })
      error = fallbackResult.error
    }

    if (error) {
      setEventSaveState('error')
      setEventSaveStatus(`Duplicate sync error: ${error.message}`)
      return
    }

    setEventSaveState('saved')
    setEventStatus('draft')
    setEventSaveStatus('Event duplicated as a new draft')
  }

  async function updateEventStatus(row: EventRow, nextStatus: EventStatus) {
    if (isSupabaseConfigured && !authUser?.email) {
      setAuthStatus('Sign in as a host to update event status.')
      return
    }

    const nextRow = { ...row, status: nextStatus }
    setEventRows((rows) => mergeEventRows(rows, nextRow))
    if (row.slug === selectedEventSlug) {
      setEventStatus(nextStatus)
    }
    setEventSaveState('saving')
    setEventSaveStatus(nextStatus === 'archived' ? 'Archiving event...' : 'Restoring event...')

    if (!supabase) {
      setEventRows((rows) => {
        const nextRows = mergeEventRows(rows, nextRow)
        window.localStorage.setItem('gatherkit-events', JSON.stringify(nextRows))
        return nextRows
      })
      setEventSaveState('saved')
      setEventSaveStatus(nextStatus === 'archived' ? 'Event archived locally' : 'Event restored locally')
      return
    }

    const { error } = await supabase
      .from('gatherkit_events')
      .update({ status: nextStatus })
      .eq('slug', row.slug)

    if (error) {
      setEventRows((rows) => mergeEventRows(rows, row))
      if (row.slug === selectedEventSlug) {
        setEventStatus(row.status ?? 'draft')
      }
      setEventSaveState('error')
      setEventSaveStatus(
        isMissingStatusColumn(error)
          ? 'Run the updated Supabase SQL before archiving events.'
          : `Status sync error: ${error.message}`,
      )
      return
    }

    setEventSaveState('saved')
    setEventSaveStatus(nextStatus === 'archived' ? 'Event moved to History' : 'Event restored to Active')
    if (nextStatus === 'archived') setEventListView('history')
  }

  function createEventFromCurrentLink() {
    createNewEvent(selectedEventSlug)
  }

  function selectEvent(row: EventRow, nextMode: AppMode = 'Organizer') {
    updateEventUrl(row.slug)
    setSelectedEventSlug(row.slug)
    setEventLookupState('found')
    applyEventRow(row)
    setActiveStep('Details')
    setEventSaveState('saved')
    setEventSaveStatus('Event selected')
    setActiveNavLabel(navLabelForMode(nextMode))
    setAppMode(nextMode)
  }

  async function copyText(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedLabel(label)
    } catch {
      setCopiedLabel('Copy blocked')
    }
    window.setTimeout(() => setCopiedLabel(''), 1600)
  }

  async function goForward() {
    const saved = await saveEventDetails(
      activeStep === 'Review' ? 'Event published' : 'Event draft saved',
      activeStep === 'Review' ? 'published' : eventStatus,
    )
    if (!saved) return

    if (activeStep === 'Details') setActiveStep('Invite')
    if (activeStep === 'Invite') setActiveStep('Review')
  }

  function formatMessageTime(value: string) {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value))
  }

  async function submitRsvp() {
    const trimmedName = neighborName.trim()
    if (!trimmedName) {
      setSubmittedMessage('Please add your name before sending your RSVP.')
      window.setTimeout(() => setSubmittedMessage(''), 2600)
      return
    }

    const nextRow: RsvpRow = {
      name: trimmedName,
      status: rsvpStatus,
      note: neighborNote.trim(),
      supply: rsvpStatus === 'No' ? '' : pledgedSupply,
      role: rsvpStatus === 'No' ? '' : pledgedRole,
    }

    if (supabase) {
      const { error } = await supabase.from('gatherkit_event_rsvps').upsert(
        {
          event_slug: selectedEventSlug,
          ...nextRow,
        },
        { onConflict: 'event_slug,name' },
      )

      if (error) {
        setSubmittedMessage(`Could not save RSVP: ${error.message}`)
        window.setTimeout(() => setSubmittedMessage(''), 3200)
        return
      }

      setSubmittedMessage(`${nextRow.name}'s RSVP is saved.`)
      window.setTimeout(() => setSubmittedMessage(''), 2400)
      return
    }

    setRsvpRows((rows) => {
      const existingIndex = rows.findIndex((row) => row.name.toLowerCase() === nextRow.name.toLowerCase())
      if (existingIndex === -1) return [nextRow, ...rows]

      return rows.map((row, index) => (index === existingIndex ? nextRow : row))
    })
    setSubmittedMessage(`${nextRow.name}'s RSVP is now in the organizer dashboard.`)
    window.setTimeout(() => setSubmittedMessage(''), 2400)
  }

  async function persistMessage(audience: MessageAudience, body: string, count: number) {
    if (isSupabaseConfigured && !authUser) {
      setCopiedLabel('Sign in as host to send updates')
      window.setTimeout(() => setCopiedLabel(''), 2600)
      return
    }

    if (isDifferentHostEvent) {
      setCopiedLabel('Create your own copy to send updates')
      setOwnershipWarning('send updates')
      window.setTimeout(() => setCopiedLabel(''), 2600)
      return
    }

    const nextMessage: MessageLogItem = {
      audience,
      body,
      count,
      sentAt: 'just now',
    }

    setMessageLog((items) => [nextMessage, ...items])

    if (supabase) {
      const { error } = await supabase.from('gatherkit_event_messages').insert({
        event_slug: selectedEventSlug,
        audience,
        body,
        recipient_count: count,
      })

      if (error) {
        setMessageLog((items) => items.filter((item) => item !== nextMessage))
        setCopiedLabel(`Message sync error: ${error.message}`)
        window.setTimeout(() => setCopiedLabel(''), 2600)
        return
      }
    }

    setCopiedLabel(`Message sent to ${count}`)
    window.setTimeout(() => setCopiedLabel(''), 1800)
  }

  function sendMessage() {
    const trimmedBody = messageBody.trim()
    if (!trimmedBody) return

    persistMessage(messageAudience, trimmedBody, audienceCounts[messageAudience])
  }

  async function toggleRunTask(taskId: string) {
    if (isSupabaseConfigured && !authUser) {
      setCopiedLabel('Sign in as host to update run sheet')
      window.setTimeout(() => setCopiedLabel(''), 2600)
      return
    }

    if (isDifferentHostEvent) {
      setCopiedLabel('Create your own copy to update the run sheet')
      setOwnershipWarning('update the run sheet')
      window.setTimeout(() => setCopiedLabel(''), 2600)
      return
    }

    const nextCompleted = !checkedRunTasks.includes(taskId)

    setCheckedRunTasks((taskIds) =>
      nextCompleted ? [...taskIds, taskId] : taskIds.filter((id) => id !== taskId),
    )

    if (supabase) {
      const { error } = await supabase.from('gatherkit_event_tasks').upsert(
        {
          event_slug: selectedEventSlug,
          task_id: taskId,
          completed: nextCompleted,
        },
        { onConflict: 'event_slug,task_id' },
      )

      if (error) {
        setCheckedRunTasks((taskIds) =>
          nextCompleted ? taskIds.filter((id) => id !== taskId) : [...taskIds, taskId],
        )
        setCopiedLabel(`Task sync error: ${error.message}`)
        window.setTimeout(() => setCopiedLabel(''), 2600)
      }
      return
    }
  }

  function sendRunSheetUpdate(body: string) {
    persistMessage('Yes and maybe', body, attendingCount)
  }

  function switchMode(mode: AppMode) {
    setActiveNavLabel(navLabelForMode(mode))
    setAppMode(mode)
  }

  function selectNavItem(label: string, mode: AppMode) {
    setActiveNavLabel(label)
    setAppMode(mode)
    setMenuOpen(false)
  }

  async function saveHostProfile() {
    const signedInEmail = authUser?.email
    if (isSupabaseConfigured && (!signedInEmail || !supabase)) {
      setProfileSaveStatus('Sign in to save your host profile.')
      setProfileSaveState('error')
      return
    }

    const nextName = hostProfileName.trim() || getDefaultHostName(signedInEmail)
    const nextPhone = hostProfilePhone.trim()

    setHostProfileName(nextName)
    setHostProfilePhone(nextPhone)
    setProfileSaveStatus('Saving host profile...')
    setProfileSaveState('saving')

    if (!supabase) {
      window.localStorage.setItem('gatherkit-host-profile', JSON.stringify({ display_name: nextName, phone: nextPhone }))
      setProfileSaveStatus('Host profile saved locally')
      setProfileSaveState('saved')
      return
    }

    const { error } = await supabase.from('gatherkit_hosts').upsert(
      {
        user_id: authUser?.id,
        display_name: nextName,
        email: signedInEmail,
        phone: nextPhone,
      },
      { onConflict: 'email' },
    )

    if (error) {
      setProfileSaveStatus(`Profile sync error: ${error.message}`)
      setProfileSaveState('error')
      return
    }

    setProfileSaveStatus('Host profile saved')
    setProfileSaveState('saved')
  }

  async function sendMagicLink() {
    const email = authEmail.trim()
    if (!email || !supabase) return

    setAuthSending(true)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.href,
        },
      })

      if (error) {
        setAuthStatus(`Sign-in error: ${formatAuthError(error)}`)
        setAuthNotice('')
        return
      }

      setAuthStatus(`Magic link sent to ${email}`)
      setAuthNotice('Check your email for the sign-in link.')
    } catch (error) {
      setAuthStatus(`Sign-in error: ${formatAuthError(error)}`)
      setAuthNotice('')
    } finally {
      setAuthSending(false)
    }
  }

  async function submitPasswordAuth() {
    const email = authEmail.trim()
    if (!email || !authPassword || !supabase) return

    setAuthSending(true)
    setAuthNotice('')

    try {
      const redirectTo = window.location.href
      const result = authMode === 'sign-up'
        ? await supabase.auth.signUp({
            email,
            password: authPassword,
            options: {
              emailRedirectTo: redirectTo,
            },
          })
        : await supabase.auth.signInWithPassword({
            email,
            password: authPassword,
          })

      if (result.error) {
        setAuthStatus(`${authMode === 'sign-up' ? 'Account setup' : 'Sign-in'} error: ${formatAuthError(result.error)}`)
        return
      }

      if (authMode === 'sign-up' && !result.data.session) {
        setAuthStatus(`Account created for ${email}`)
        setAuthNotice('Check your email once to verify this account.')
        return
      }

      authCheckVersion.current += 1
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      const signedInUser = sessionData.session?.user ?? result.data.session?.user ?? result.data.user

      if (sessionError || !sessionData.session || !signedInUser) {
        setAuthUser(null)
        setAuthStatus(
          sessionError
            ? `Session error: ${formatAuthError(sessionError)}`
            : 'Password accepted, but Supabase did not return a signed-in session. Try refreshing the page.',
        )
        setAuthNotice('')
        return
      }

      setAuthUser({ id: signedInUser.id, email: signedInUser.email })
      setAuthEmail(signedInUser.email ?? email)
      if (signedInUser.email && hostEmail === defaultEventDraft.host_email) {
        setHostEmail(signedInUser.email)
      }
      setAuthStatus(`Signed in as ${signedInUser.email ?? email}`)
      setAuthNotice('')
    } catch (error) {
      setAuthStatus(`${authMode === 'sign-up' ? 'Account setup' : 'Sign-in'} error: ${formatAuthError(error)}`)
    } finally {
      setAuthSending(false)
    }
  }

  async function signOutHost() {
    if (!supabase) return

    await supabase.auth.signOut()
    setAuthUser(null)
    setAuthStatus('Signed out')
    setAuthNotice('')
    setAppMode('Neighbor RSVP')
    setActiveNavLabel('Neighbors')
  }

  function navLabelForMode(mode: AppMode) {
    if (mode === 'Events') return 'Events'
    if (mode === 'Message Center') return 'Messages'
    if (mode === 'Run Sheet') return 'Checklists'
    if (mode === 'Neighbor RSVP') return 'Neighbors'
    if (mode === 'Settings') return 'Settings'
    return 'Dashboard'
  }

  function formatAuthError(error: unknown) {
    if (!error) return 'Supabase did not return an error message.'
    if (typeof error === 'string') return normalizeAuthMessage(error)

    if (error instanceof Error && error.message) return normalizeAuthMessage(error.message)

    if (typeof error === 'object') {
      const errorRecord = error as Record<string, unknown>
      const message = errorRecord.message ?? errorRecord.error_description ?? errorRecord.error
      const status = errorRecord.status ?? errorRecord.statusCode
      const code = errorRecord.code

      if (typeof message === 'string' && message.trim()) {
        return [
          normalizeAuthMessage(message),
          code ? `code ${code}` : '',
          status ? `status ${status}` : '',
        ].filter(Boolean).join(' / ')
      }

      const serialized = JSON.stringify(errorRecord)
      if (serialized && serialized !== '{}') return serialized
    }

    return 'Unable to send magic link. Check Supabase Auth SMTP, redirect URLs, and rate limits.'
  }

  function normalizeAuthMessage(message: string) {
    const trimmedMessage = message.trim()

    if (!trimmedMessage || trimmedMessage === '{}' || trimmedMessage === '[]') {
      return 'Supabase returned an empty auth error. Check Auth email SMTP settings, redirect URLs, and email rate limits.'
    }

    return trimmedMessage
  }

  function buildStarterEvent(slug: string): EventRow {
    const nextTemplate = eventTemplates[0]

    return {
      slug,
      event_type: nextTemplate.label,
      name: nextTemplate.headline,
      date_label: defaultEventDraft.date_label,
      time_label: nextTemplate.duration,
      location: nextTemplate.location,
      rsvp_deadline: defaultEventDraft.rsvp_deadline,
      bring_note: nextTemplate.bringNote,
      host_name: hostProfileName.trim() || hostName.trim() || getDefaultHostName(authUser?.email),
      host_phone: hostProfilePhone.trim() || hostPhone.trim() || defaultEventDraft.host_phone,
      host_email: authUser?.email ?? (hostEmail.trim() || defaultEventDraft.host_email),
      status: 'draft',
    }
  }

  function mergeEventRows(rows: EventRow[], nextRow: EventRow) {
    const exists = rows.some((row) => row.slug === nextRow.slug)
    if (!exists) return [nextRow, ...rows]

    return rows.map((row) => (row.slug === nextRow.slug ? nextRow : row))
  }

  function localStorageKey(kind: string) {
    return `gatherkit-${kind}-${selectedEventSlug}`
  }

  function readLocalList<T>(key: string, fallback: T[]) {
    const storedValue = window.localStorage.getItem(key)
    if (!storedValue) return fallback

    try {
      return JSON.parse(storedValue) as T[]
    } catch {
      return fallback
    }
  }

  return (
    <div className={isPublicInviteMode ? 'app-shell public-invite-shell' : 'app-shell'}>
      {!isPublicInviteMode && (
        <button
          aria-label="Close menu"
          className={menuOpen ? 'sidebar-backdrop open' : 'sidebar-backdrop'}
          onClick={() => setMenuOpen(false)}
          type="button"
        />
      )}
      {!isPublicInviteMode && <aside className={menuOpen ? 'sidebar open' : 'sidebar'}>
        <div className="brand-art">
          <img src={neighborhoodArt} alt="Evening neighborhood houses" />
        </div>
        <div className="brand-copy">
          <p className="eyebrow">GatherKit</p>
          <h1>Our Neighborhood</h1>
          <span>Stronger together.</span>
        </div>

        <nav aria-label="Primary">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                className={activeNavLabel === item.label ? 'nav-item active' : 'nav-item'}
                key={item.label}
                onClick={() => selectNavItem(item.label, item.mode)}
                type="button"
              >
                <Icon size={21} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="neighbor-note">
          <Sparkles size={24} />
          <strong>{sidebarStatus.title}</strong>
          <span>{sidebarStatus.body}</span>
        </div>
      </aside>}

      <main className="workspace">
        <header className={isPublicInviteMode ? 'topbar public-invite-topbar' : 'topbar'}>
          {!isPublicInviteMode && (
            <button
              aria-expanded={menuOpen}
              className="icon-button"
              onClick={() => setMenuOpen((isOpen) => !isOpen)}
              type="button"
              aria-label="Open menu"
            >
              <Menu />
            </button>
          )}
          <div className="topbar-copy">
            <h2>{isPublicInviteMode ? inviteTopbarTitle : topbarTitle}</h2>
            <p>{isPublicInviteMode ? inviteTopbarSubtitle : topbarSubtitle}</p>
          </div>
          {isPublicInviteMode ? (
            <button className="host-sign-in-link" onClick={() => switchMode('Organizer')} type="button">
              Host sign in
              <ChevronRight size={17} />
            </button>
          ) : isSupabaseConfigured && (
            <div className="auth-pill">
              {authUser ? (
                <>
                  <span>{hostEmailLabel}</span>
                  <button onClick={signOutHost} type="button">Sign out</button>
                </>
              ) : (
                <>
                  <input
                    aria-label="Host email"
                    placeholder="host@email.com"
                    value={authEmail}
                    onChange={(event) => setAuthEmail(event.target.value)}
                  />
                  <input
                    aria-label="Host password"
                    placeholder="Password"
                    type="password"
                    value={authPassword}
                    onChange={(event) => setAuthPassword(event.target.value)}
                  />
                  <button disabled={authSending} onClick={submitPasswordAuth} type="button">
                    {authSending ? 'Working...' : authMode === 'sign-up' ? 'Create' : 'Sign in'}
                  </button>
                  {authNotice && <strong>{authNotice}</strong>}
                </>
              )}
            </div>
          )}
          {!isPublicInviteMode && <div className="mode-toggle" aria-label="View mode">
            {(['Organizer', 'Message Center', 'Run Sheet', 'Neighbor RSVP'] as AppMode[]).map((mode) => (
              <button
                className={appMode === mode ? 'selected' : ''}
                key={mode}
                onClick={() => switchMode(mode)}
                type="button"
              >
                {mode === 'Organizer' ? (
                  <ClipboardList size={17} />
                ) : mode === 'Message Center' ? (
                  <MessageSquare size={17} />
                ) : mode === 'Run Sheet' ? (
                  <Clock3 size={17} />
                ) : (
                  <UserRoundCheck size={17} />
                )}
                {mode}
              </button>
            ))}
          </div>}
          {!isPublicInviteMode && <div className="topbar-actions">
            <button className="bell-button" type="button" aria-label="Notifications">
              <Bell />
              <span>2</span>
            </button>
            <div className="profile-chip">
              <div className="avatar">{profileInitials}</div>
              <span>{topbarProfileName}</span>
              <ChevronDown size={18} />
            </div>
          </div>}
        </header>

        {shouldShowAuthGate ? (
          <section className="auth-workspace" aria-label="Host sign in">
            <div className="auth-panel">
              <div className="heading-icon">
                <UserRoundCheck />
              </div>
              <div>
                <span className="eyebrow">Host Access</span>
                <h2>{authGateTitle}</h2>
                <p>{authGateDescription}</p>
              </div>
              <div className="auth-form">
                <div className="auth-mode-toggle" aria-label="Authentication mode">
                  <button
                    className={authMode === 'sign-in' ? 'selected' : ''}
                    onClick={() => setAuthMode('sign-in')}
                    type="button"
                  >
                    Sign in
                  </button>
                  <button
                    className={authMode === 'sign-up' ? 'selected' : ''}
                    onClick={() => setAuthMode('sign-up')}
                    type="button"
                  >
                    Create account
                  </button>
                </div>
                <input
                  aria-label="Host email"
                  placeholder="host@email.com"
                  value={authEmail}
                  onChange={(event) => setAuthEmail(event.target.value)}
                />
                <input
                  aria-label="Host password"
                  placeholder="Password"
                  type="password"
                  value={authPassword}
                  onChange={(event) => setAuthPassword(event.target.value)}
                />
                <button className="primary-action" disabled={authSending} onClick={submitPasswordAuth} type="button">
                  {authSending ? 'Working...' : authMode === 'sign-up' ? 'Create Account' : 'Sign In'}
                  <UserRoundCheck size={19} />
                </button>
                <button className="secondary-action magic-link-action" disabled={authSending} onClick={sendMagicLink} type="button">
                  Email me a sign-in link
                  <Mail size={19} />
                </button>
                <span>{authStatus}</span>
                {authNotice && <strong>{authNotice}</strong>}
              </div>
              <button className="secondary-action public-rsvp-action" onClick={() => switchMode('Neighbor RSVP')} type="button">
                View Public RSVP
                <ChevronRight size={19} />
              </button>
            </div>
          </section>
        ) : shouldShowOwnershipGate ? (
          <section className="ownership-workspace" aria-label="Event ownership notice">
            <div className="ownership-panel">
              <div className="heading-icon">
                <UserRoundCheck />
              </div>
              <div>
                <span className="eyebrow">Host Access</span>
                <h2>This event is owned by another host.</h2>
                <p>
                  You are signed in as <strong>{authUser?.email}</strong>, but this event is owned by{' '}
                  <strong>{hostEmail}</strong>. You can still view the public RSVP page, or make a copy under your
                  account and manage that version.
                </p>
              </div>
              <div className="ownership-summary">
                <span>Current event</span>
                <strong>{eventName}</strong>
                <small>
                  {date} at {location}
                </small>
              </div>
              <div className="ownership-actions">
                <button className="primary-action" onClick={createOwnedCopyOfCurrentEvent} type="button">
                  Create My Copy
                  <Copy size={19} />
                </button>
                <button className="secondary-action" onClick={() => switchMode('Neighbor RSVP')} type="button">
                  View Public RSVP
                  <ChevronRight size={19} />
                </button>
              </div>
              <p className="ownership-footnote">
                To edit the original event, sign in with the owner email. This keeps different hosts from changing each
                other's plans by accident.
              </p>
            </div>
          </section>
        ) : eventLookupState === 'missing' && appMode !== 'Events' ? (
          <section className="event-missing-workspace" aria-label="Event not found">
            <div className="event-missing-panel">
              <div className="heading-icon">
                <CalendarDays />
              </div>
              <div>
                <span className="eyebrow">Event Link</span>
                <h2>No event found for this link.</h2>
                <p>
                  The link points to <strong>{selectedEventSlug}</strong>, but GatherKit does not have an event with that slug yet.
                </p>
              </div>
              <div className="missing-actions">
                <button className="primary-action" onClick={createEventFromCurrentLink} type="button">
                  Create This Event
                  <PlusCircle size={19} />
                </button>
                <button className="secondary-action" onClick={() => selectNavItem('Events', 'Events')} type="button">
                  View Events
                  <ChevronRight size={19} />
                </button>
              </div>
            </div>
          </section>
        ) : appMode === 'Events' ? (
          <section className="events-workspace" aria-label="Events dashboard">
            <div className="events-header">
              <div>
                <span className="eyebrow">Events</span>
                <h2>Manage neighborhood gatherings.</h2>
                <p>Switch between active plans, review history, and duplicate past gatherings into fresh drafts.</p>
              </div>
              <button className="primary-action" onClick={() => createNewEvent()} type="button">
                New Event
                <PlusCircle size={19} />
              </button>
            </div>

            <div className="event-list-toggle" aria-label="Event list view">
              <button
                className={eventListView === 'active' ? 'selected' : ''}
                onClick={() => setEventListView('active')}
                type="button"
              >
                Active
                <span>{activeEventRows.length}</span>
              </button>
              <button
                className={eventListView === 'history' ? 'selected' : ''}
                onClick={() => setEventListView('history')}
                type="button"
              >
                History
                <span>{archivedEventRows.length}</span>
              </button>
            </div>

            {visibleEventRows.length > 0 ? (
              <div className="events-grid">
                {visibleEventRows.map((row) => (
                  <article
                    className={row.slug === selectedEventSlug ? 'event-card selected' : 'event-card'}
                    key={row.slug}
                  >
                    <span className="event-card-badges">
                      <span className="event-card-type">{row.event_type}</span>
                      <span className={`event-status ${row.status ?? 'draft'}`}>
                        {row.status === 'published' ? 'Published' : row.status === 'archived' ? 'Archived' : 'Draft'}
                      </span>
                    </span>
                    <strong>{row.name}</strong>
                    <span className="event-card-meta">
                      <CalendarDays size={15} />
                      {row.date_label}
                    </span>
                    <span className="event-card-meta">
                      <Clock3 size={15} />
                      {row.time_label}
                    </span>
                    <span className="event-card-meta">
                      <MapPin size={15} />
                      {row.location}
                    </span>
                    <span className="event-card-host">Host: {row.host_name}</span>
                    <span className="event-card-actions">
                      <button className="event-card-action" onClick={() => selectEvent(row)} type="button">
                        Open planner
                        <ChevronRight size={17} />
                      </button>
                      <button className="event-card-duplicate" onClick={() => duplicateEvent(row)} type="button">
                        <Copy size={16} />
                        Duplicate
                      </button>
                      {row.status === 'archived' ? (
                        <button className="event-card-duplicate" onClick={() => updateEventStatus(row, 'draft')} type="button">
                          <CheckCircle2 size={16} />
                          Restore
                        </button>
                      ) : (
                        <button className="event-card-archive" onClick={() => updateEventStatus(row, 'archived')} type="button">
                          <FileText size={16} />
                          Archive
                        </button>
                      )}
                    </span>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-events">
                <CalendarDays />
                <div>
                  <h3>{eventListView === 'active' ? 'No active events yet.' : 'No archived events yet.'}</h3>
                  <p>
                    {eventListView === 'active'
                      ? 'Create your first event draft, then share its public RSVP link with neighbors.'
                      : 'Archived events will appear here and can be duplicated for future gatherings.'}
                  </p>
                </div>
                {eventListView === 'active' && (
                  <button className="primary-action" onClick={() => createNewEvent()} type="button">
                    New Event
                    <PlusCircle size={19} />
                  </button>
                )}
              </div>
            )}
          </section>
        ) : appMode === 'Settings' ? (
          <section className="settings-workspace" aria-label="Host settings">
            <div className="settings-panel">
              <div className="section-heading settings-heading">
                <div className="heading-icon">
                  <Settings />
                </div>
                <div>
                  <span className="eyebrow">Host Profile</span>
                  <h2>Keep your organizer details ready.</h2>
                  <p>New event drafts will use this profile by default. You can still edit contact details on each event.</p>
                </div>
              </div>

              <div className="settings-grid">
                <label className="field">
                  Display Name
                  <div className="input-shell">
                    <UserRoundCheck size={22} />
                    <input
                      value={hostProfileName}
                      onChange={(event) => setHostProfileName(event.target.value)}
                      placeholder="Your name"
                    />
                  </div>
                </label>
                <label className="field">
                  Phone
                  <div className="input-shell">
                    <Users size={22} />
                    <input
                      value={hostProfilePhone}
                      onChange={(event) => setHostProfilePhone(event.target.value)}
                      placeholder="Phone number"
                    />
                  </div>
                </label>
                <label className="field wide">
                  Login Email
                  <div className="input-shell readonly-shell">
                    <Mail size={22} />
                    <input value={authUser?.email ?? ''} readOnly />
                  </div>
                </label>
              </div>

              <div className="profile-preview">
                <span>New event default</span>
                <strong>{hostProfileName.trim() || getDefaultHostName(authUser?.email)}</strong>
                <p>
                  {hostProfilePhone.trim() || 'No phone added'} / {authUser?.email ?? 'No email'}
                </p>
              </div>

              <div className="save-row">
                <div className={`saved-state ${profileSaveState}`}>
                  <CheckCircle2 />
                  <div>
                    <span>{profileSaveStatus}</span>
                    <small>Used when you create your next event draft.</small>
                  </div>
                </div>
                <button className="primary-action" onClick={saveHostProfile} type="button">
                  Save Profile
                  <Check size={19} />
                </button>
              </div>
            </div>
          </section>
        ) : appMode === 'Organizer' ? (
        <>
        <section className="content-grid" aria-label="Event planning workspace">
          <section className="planner-panel">
            <div className="panel-heading">
              <div className="heading-icon">
                <CalendarDays />
              </div>
              <div>
                <h2>Plan Your Event</h2>
                <p>Turn the details into invites, reminders, signups, and day-of tasks.</p>
              </div>
              <button className="new-event-button" onClick={() => createNewEvent()} type="button">
                <PlusCircle size={18} />
                New Event
              </button>
              <div className="stepper" aria-label="Planning steps">
                {planningSteps.map((step, index) => (
                  <div className="step-wrap" key={step}>
                    {index > 0 && <span className="line" />}
                    <button
                      aria-label={`Go to ${step}`}
                      className={step === activeStep ? 'step active' : 'step'}
                      onClick={() => setActiveStep(step)}
                      type="button"
                    >
                      {index + 1}
                    </button>
                    <span className="step-label">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="event-types" aria-label="Event types">
              {eventTemplates.map((item) => (
                <button
                  className={item.label === eventType ? 'type-pill selected' : 'type-pill'}
                  key={item.label}
                  onClick={() => handleTypeChange(item.label)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>

            {activeStep === 'Details' && (
              <>
                <div className="form-grid">
                  <label className="field">
                    <span>Event Name</span>
                    <div className="input-shell">
                      <PenLine size={22} />
                      <input value={eventName} onChange={(event) => setEventName(event.target.value)} />
                    </div>
                  </label>

                  <label className="field">
                    <span>Event Type</span>
                    <div className="input-shell select-shell">
                      <Gift size={22} />
                      <select value={eventType} onChange={(event) => handleTypeChange(event.target.value as EventType)}>
                        {eventTemplates.map((item) => (
                          <option key={item.label}>{item.label}</option>
                        ))}
                      </select>
                      <ChevronDown size={18} />
                    </div>
                  </label>

                  <label className="field">
                    <span>Date</span>
                    <div className="input-shell">
                      <CalendarDays size={22} />
                      <input
                        type="date"
                        value={dateLabelToDateInput(date)}
                        onChange={(event) => handleEventDateChange(event.target.value)}
                      />
                    </div>
                  </label>

                  <label className="field">
                    <span>Start Time</span>
                    <div className="input-shell">
                      <Clock3 size={22} />
                      <input
                        type="time"
                        value={eventStartTime}
                        onChange={(event) => handleStartTimeChange(event.target.value)}
                      />
                    </div>
                  </label>

                  <label className="field">
                    <span>End Time</span>
                    <div className="input-shell">
                      <Clock3 size={22} />
                      <input
                        type="time"
                        value={eventEndTime}
                        onChange={(event) => handleEndTimeChange(event.target.value)}
                      />
                    </div>
                  </label>

                  <label className="field wide">
                    <span>Location</span>
                    <div className="input-shell">
                      <MapPin size={22} />
                      <input value={location} onChange={(event) => setLocation(event.target.value)} />
                      <ChevronDown size={18} />
                    </div>
                  </label>

                  <label className="field">
                    <span>RSVP Deadline</span>
                    <div className="input-shell">
                      <CalendarDays size={22} />
                      <input
                        type="date"
                        value={dateLabelToDateInput(rsvpDate)}
                        onChange={(event) => handleRsvpDateChange(event.target.value)}
                      />
                    </div>
                  </label>

                  <label className="field wide-on-medium">
                    <span>Bring Note</span>
                    <div className="input-shell">
                      <Gift size={22} />
                      <input value={bringNote} onChange={(event) => setBringNote(event.target.value)} />
                    </div>
                  </label>
                </div>

                <div className="role-section">
                  <div>
                    <h3>Volunteer Roles</h3>
                    <p>Template roles change with the event type.</p>
                  </div>
                  <div className="role-list">
                    {template.roles.map((role) => (
                      <button
                        className={selectedRoles.includes(role) ? 'role-token selected' : 'role-token'}
                        key={role}
                        onClick={() =>
                          setSelectedRoles((roles) =>
                            roles.includes(role) ? roles.filter((item) => item !== role) : [...roles, role],
                          )
                        }
                        type="button"
                      >
                        {selectedRoles.includes(role) && <Check size={16} />}
                        {role}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="host-row">
                  <label className="field">
                    <span>Host</span>
                    <div className="input-shell">
                      <Users size={22} />
                      <input value={hostName} onChange={(event) => setHostName(event.target.value)} />
                    </div>
                  </label>
                  <label className="field">
                    <span>Phone</span>
                    <div className="input-shell">
                      <MessageSquare size={22} />
                      <input value={hostPhone} onChange={(event) => setHostPhone(event.target.value)} />
                    </div>
                  </label>
                  <label className="field">
                    <span>Email</span>
                    <div className="input-shell">
                      <Mail size={22} />
                      <input value={hostEmail} onChange={(event) => setHostEmail(event.target.value)} />
                    </div>
                  </label>
                </div>
              </>
            )}

            {activeStep === 'Invite' && (
              <div className="invite-workspace">
                {[
                  { label: 'Facebook Post', icon: Megaphone, copy: inviteDraft },
                  { label: 'Text Message', icon: MessageSquare, copy: reminderDraft },
                  { label: 'Flyer Copy', icon: FileText, copy: flyerDraft },
                  { label: 'RSVP Link', icon: ExternalLink, copy: rsvpLink },
                ].map((item) => {
                  const Icon = item.icon
                  return (
                    <article className="channel-card" key={item.label}>
                      <div className="channel-title">
                        <Icon size={20} />
                        <h3>{item.label}</h3>
                      </div>
                      <p>{item.copy}</p>
                      <button onClick={() => copyText(item.label, item.copy)} type="button">
                        <Copy size={17} />
                        {copiedLabel === item.label ? 'Copied' : 'Copy'}
                      </button>
                    </article>
                  )
                })}
                <div className="reminder-plan">
                  <h3>Reminder Schedule</h3>
                  <div>
                    <CheckCircle2 />
                    <span>RSVP reminder 3 days before deadline</span>
                  </div>
                  <div>
                    <CheckCircle2 />
                    <span>Final details the morning of the event</span>
                  </div>
                </div>
              </div>
            )}

            {activeStep === 'Review' && (
              <div className="review-workspace">
                <section className="readiness-card">
                  <div>
                    <span className="metric">{readinessScore}%</span>
                    <h3>Ready to publish</h3>
                    <p>
                      {completeTasks.length} of {template.tasks.length} planning checks are complete.
                    </p>
                  </div>
                  <button
                    className="primary-action"
                    disabled={eventSaveState === 'saving'}
                    onClick={() => saveEventDetails('Event published', 'published')}
                    type="button"
                  >
                    Publish Event
                    <ChevronRight size={21} />
                  </button>
                </section>
                {eventStatus === 'published' && (
                  <section className="published-card">
                    <div>
                      <span className="event-status published">Published</span>
                      <h3>Public RSVP link is ready.</h3>
                      <p>{rsvpLink}</p>
                    </div>
                    <button className="secondary-action" onClick={() => copyText('RSVP Link', rsvpLink)} type="button">
                      <Copy size={18} />
                      {copiedLabel === 'RSVP Link' ? 'Copied' : 'Copy Link'}
                    </button>
                  </section>
                )}
                <section className="review-grid">
                  <article>
                    <h3>Organizer Packet</h3>
                    <p>Invite copy, text reminder, flyer copy, RSVP link, and supply signup.</p>
                  </article>
                  <article>
                    <h3>Recurring Event</h3>
                    <p>Create next week's draft with the same setup and a fresh RSVP list.</p>
                    <button className="inline-card-action" onClick={() => duplicateEvent()} type="button">
                      <Copy size={17} />
                      Duplicate Event
                    </button>
                  </article>
                  <article>
                    <h3>Event History</h3>
                    <p>{eventStatus === 'archived' ? 'Restore this event to the active dashboard.' : 'Move this event to History when it is complete.'}</p>
                    <button
                      className={eventStatus === 'archived' ? 'inline-card-action' : 'inline-card-action danger'}
                      onClick={() => updateEventStatus(buildEventDraft(), eventStatus === 'archived' ? 'draft' : 'archived')}
                      type="button"
                    >
                      <FileText size={17} />
                      {eventStatus === 'archived' ? 'Restore Event' : 'Archive Event'}
                    </button>
                  </article>
                  <article>
                    <h3>Roles Open</h3>
                    <p>{selectedRoles.join(', ') || 'No roles selected yet'}</p>
                  </article>
                  <article>
                    <h3>Host Contact</h3>
                    <p>
                      {hostName} / {hostPhone} / {hostEmail}
                    </p>
                  </article>
                </section>
                <section className="rsvp-table">
                  <h3>RSVP Snapshot</h3>
                  {rsvpRows.map((row) => (
                    <div className="rsvp-row" key={row.name}>
                      <strong>{row.name}</strong>
                      <span>{row.status}</span>
                      <p>{row.note}</p>
                    </div>
                  ))}
                </section>
              </div>
            )}

            <div className="save-row">
              <div className={`saved-state ${eventSaveState}`}>
                <CheckCircle2 />
                <div>
                  <strong>
                    {eventSaveState === 'saving'
                      ? 'Saving draft'
                      : eventSaveState === 'error'
                        ? 'Sync needs attention'
                        : eventSaveState === 'saved'
                          ? 'Draft saved'
                          : 'Event draft status'}
                  </strong>
                  <span>
                    {copiedLabel
                      ? copiedLabel === 'Copy blocked'
                        ? copiedLabel
                        : `${copiedLabel} copied`
                      : eventSaveStatus}
                  </span>
                </div>
              </div>
              <div className="save-actions">
                <button
                  className="secondary-action"
                  disabled={eventSaveState === 'saving'}
                  onClick={() => saveEventDetails()}
                  type="button"
                >
                  <FileText size={20} />
                  {eventSaveState === 'saving' ? 'Saving...' : 'Save Draft'}
                </button>
                <button
                  className="primary-action"
                  disabled={eventSaveState === 'saving'}
                  onClick={goForward}
                  type="button"
                >
                  {activeStep === 'Review' ? 'Publish Event' : 'Continue'}
                  <ChevronRight size={21} />
                </button>
              </div>
            </div>
          </section>

          <aside className="insights">
            <section className="side-card preview-card">
              <div className="side-card-title">
                <h3>Upcoming Event Preview</h3>
                <Sparkles size={20} />
              </div>
              <div className="preview-body">
                <img src={neighborhoodArt} alt="Neighborhood event patio preview" />
                <div>
                  <h4>{eventName}</h4>
                  <p>
                    <CalendarDays size={15} />
                    {date}
                  </p>
                  <p>
                    <Clock3 size={15} />
                    {time}
                  </p>
                  <p>
                    <MapPin size={15} />
                    {location}
                  </p>
                </div>
              </div>
              <div className="attendance-strip">
                <Users />
                <div>
                  <strong>{attendingCount} neighbors attending</strong>
                  <span>{yesCount} yes &middot; {maybeCount} maybe</span>
                </div>
                <ChevronRight />
              </div>
            </section>

            <section className="side-card checklist-card">
              <h3>Planning Checklist</h3>
              <div className="accent-line" />
              <ul>
                {completeTasks.map((task) => (
                  <li key={task}>
                    <CheckCircle2 className="checked" />
                    <span>{task}</span>
                  </li>
                ))}
                {openTasks.map((task) => (
                  <li key={task}>
                    <span className="open-circle" />
                    <span>{task}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="side-card supplies-card">
              <h3>Supply Signup</h3>
              <div className="supply-list">
                {template.supplies.map((supply) => (
                  <div className="supply-row" key={supply}>
                    <span>{supply}</span>
                    <strong>{claimedSupplies.has(supply) ? 'claimed' : 'open'}</strong>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </section>

        <section className="output-dock" aria-label="Generated organizer outputs">
          <article>
            <div className="output-title">
              <Send size={18} />
              <h3>Invite Draft</h3>
            </div>
            <p>{inviteDraft}</p>
            <button onClick={() => copyText('Invite Draft', inviteDraft)} type="button">
              <Copy size={17} />
              {copiedLabel === 'Invite Draft' ? 'Copied' : 'Copy'}
            </button>
          </article>
          <article>
            <div className="output-title">
              <Bell size={18} />
              <h3>Reminder Draft</h3>
            </div>
            <p>{reminderDraft}</p>
            <button onClick={() => copyText('Reminder Draft', reminderDraft)} type="button">
              <Copy size={17} />
              {copiedLabel === 'Reminder Draft' ? 'Copied' : 'Copy'}
            </button>
          </article>
        </section>
        </>
        ) : appMode === 'Message Center' ? (
          <section className="message-center" aria-label="Message center">
            <div className="message-header">
              <div>
                <span className="eyebrow">Message Center</span>
                <h2>Send the right reminder to the right neighbors.</h2>
                <p>Use RSVP, supply, and volunteer data to target updates without rebuilding lists by hand.</p>
              </div>
              <div className="message-stats">
                <div>
                  <strong>{attendingCount}</strong>
                  <span>attending</span>
                </div>
                <div>
                  <strong>{noResponseCount}</strong>
                  <span>need RSVP</span>
                </div>
                <div>
                  <strong>{claimedSupplies.size}</strong>
                  <span>supplies covered</span>
                </div>
              </div>
            </div>

            <div className="message-grid">
              <section className="composer-panel">
                <div className="section-heading">
                  <h3>Compose Update</h3>
                  <span>{audienceCounts[messageAudience]} recipients</span>
                </div>
                <div className="audience-grid" aria-label="Message audience">
                  {(['Everyone invited', 'Yes and maybe', 'Needs RSVP', 'Supply helpers', 'Volunteer roles'] as MessageAudience[]).map(
                    (audience) => (
                      <button
                        className={messageAudience === audience ? 'selected' : ''}
                        key={audience}
                        onClick={() => setMessageAudience(audience)}
                        type="button"
                      >
                        <span>{audience}</span>
                        <strong>{audienceCounts[audience]}</strong>
                      </button>
                    ),
                  )}
                </div>
                <label className="field">
                  <span>Message</span>
                  <div className="input-shell note-shell message-shell">
                    <MessageSquare size={22} />
                    <textarea value={messageBody} onChange={(event) => setMessageBody(event.target.value)} />
                  </div>
                </label>
                <div className="message-actions">
                  <button className="secondary-action" onClick={() => copyText('Message Draft', messageBody)} type="button">
                    <Copy size={18} />
                    {copiedLabel === 'Message Draft' ? 'Copied' : 'Copy Draft'}
                  </button>
                  <button className="primary-action" onClick={sendMessage} type="button">
                    Send Update
                    <Send size={19} />
                  </button>
                </div>
              </section>

              <aside className="message-sidebar">
                <section>
                  <h3>Audience Preview</h3>
                  {rsvpRows
                    .filter((row) => {
                      if (messageAudience === 'Everyone invited') return true
                      if (messageAudience === 'Yes and maybe') return row.status === 'Yes' || row.status === 'Maybe'
                      if (messageAudience === 'Supply helpers') return Boolean(row.supply)
                      if (messageAudience === 'Volunteer roles') return Boolean(row.role)
                      return false
                    })
                    .slice(0, 5)
                    .map((row) => (
                      <div className="audience-row" key={row.name}>
                        <strong>{row.name}</strong>
                        <span>{row.status}{row.supply ? ` / ${row.supply}` : ''}</span>
                      </div>
                    ))}
                  {messageAudience === 'Needs RSVP' && <p className="complete-note">{noResponseCount} neighbors have not responded yet.</p>}
                </section>
                <section>
                  <h3>Sent Updates</h3>
                  {messageLog.length > 0 ? (
                    messageLog.map((item, index) => (
                      <div className="sent-row" key={`${item.audience}-${index}`}>
                        <strong>{item.audience}</strong>
                        <span>{item.count} recipients - {item.sentAt}</span>
                        <p>{item.body}</p>
                      </div>
                    ))
                  ) : (
                    <p className="empty-note">No updates sent yet.</p>
                  )}
                </section>
              </aside>
            </div>
          </section>
        ) : appMode === 'Run Sheet' ? (
          <section className="run-sheet" aria-label="Day-of run sheet">
            <div className="run-header">
              <div>
                <span className="eyebrow">Day-Of Run Sheet</span>
                <h2>{eventName}</h2>
                <p>{date} at {location} / {time}</p>
              </div>
              <div className="run-progress">
                <strong>{checkedRunTasks.length}/{runSheetTasks.length}</strong>
                <span>tasks complete</span>
              </div>
            </div>

            <div className="run-alerts">
              <article>
                <h3>Needs Attention</h3>
                <p>{openRunSheetTasks.length} open tasks / {stillNeededSupplies.length} supplies open / {missingRoles.length} roles unfilled</p>
              </article>
              <button
                className="secondary-action"
                onClick={() => sendRunSheetUpdate(`Setup for ${eventName} starts soon at ${location}. Please check in with ${hostName} when you arrive.`)}
                type="button"
              >
                <Send size={18} />
                Setup Reminder
              </button>
              <button
                className="primary-action"
                onClick={() => sendRunSheetUpdate(`Thanks for joining ${eventName}. Please help reset ${location} before you leave.`)}
                type="button"
              >
                Cleanup Update
                <Send size={18} />
              </button>
            </div>

            <div className="run-grid">
              <section className="timeline-panel">
                <div className="section-heading">
                  <h3>Timeline</h3>
                  <span>{openRunSheetTasks.length} open</span>
                </div>
                {runSheetTasks.map((item) => {
                  const isChecked = checkedRunTasks.includes(item.id)
                  return (
                    <button
                      className={isChecked ? 'timeline-item checked' : 'timeline-item'}
                      key={item.id}
                      onClick={() => toggleRunTask(item.id)}
                      type="button"
                    >
                      <span className="timeline-time">{item.time}</span>
                      <span className="timeline-check">{isChecked ? <Check size={17} /> : null}</span>
                      <span>
                        <strong>{item.task}</strong>
                        <em>{item.owner}</em>
                      </span>
                    </button>
                  )
                })}
              </section>

              <aside className="run-sidebar">
                <section>
                  <h3>Volunteer Assignments</h3>
                  {assignedRoles.map((item) => (
                    <div className="assignment-row" key={item.role}>
                      <span>{item.role}</span>
                      <strong>{item.owner || 'Open'}</strong>
                    </div>
                  ))}
                </section>
                <section>
                  <h3>Supply Check</h3>
                  {template.supplies.map((supply) => (
                    <div className="assignment-row" key={supply}>
                      <span>{supply}</span>
                      <strong>{claimedSupplies.has(supply) ? 'Covered' : 'Open'}</strong>
                    </div>
                  ))}
                </section>
                <section>
                  <h3>Last-Minute Questions</h3>
                  {rsvpRows.slice(0, 3).map((row) => (
                    <div className="question-row" key={row.name}>
                      <strong>{row.name}</strong>
                      <p>{row.note}</p>
                    </div>
                  ))}
                </section>
              </aside>
            </div>
          </section>
        ) : (
          <section className="neighbor-page" aria-label="Neighbor RSVP page">
            <div className="neighbor-hero">
              <img src={neighborhoodArt} alt="Neighborhood event" />
              <div>
                <span className="eyebrow">Our Neighborhood</span>
                <h2>{eventName}</h2>
                <p>{template.description}</p>
                <div className="neighbor-meta">
                  <span><CalendarDays size={16} /> {date}</span>
                  <span><Clock3 size={16} /> {time}</span>
                  <span><MapPin size={16} /> {location}</span>
                </div>
              </div>
            </div>

            <div className="neighbor-grid">
              <section className="rsvp-form">
                <div className="section-heading">
                  <h3>RSVP</h3>
                  <span>Deadline: {rsvpDate}</span>
                </div>
                <label className="field">
                  <span>Your Name</span>
                  <div className="input-shell">
                    <Users size={22} />
                    <input
                      placeholder="Enter your name"
                      value={neighborName}
                      onChange={(event) => setNeighborName(event.target.value)}
                    />
                  </div>
                </label>
                <div className="status-options" aria-label="RSVP status">
                  {(['Yes', 'Maybe', 'No'] as RsvpStatus[]).map((status) => (
                    <button
                      className={rsvpStatus === status ? 'selected' : ''}
                      key={status}
                      onClick={() => setRsvpStatus(status)}
                      type="button"
                    >
                      {status}
                    </button>
                  ))}
                </div>
                <label className="field">
                  <span>What can you bring?</span>
                  <div className="input-shell select-shell">
                    <Gift size={22} />
                    <select value={pledgedSupply} onChange={(event) => setPledgedSupply(event.target.value)}>
                      <option value="">Choose an item</option>
                      {template.supplies.map((supply) => (
                        <option key={supply}>{supply}</option>
                      ))}
                    </select>
                    <ChevronDown size={18} />
                  </div>
                </label>
                <label className="field">
                  <span>Can you help with a role?</span>
                  <div className="input-shell select-shell">
                    <UserRoundCheck size={22} />
                    <select value={pledgedRole} onChange={(event) => setPledgedRole(event.target.value)}>
                      <option value="">No role this time</option>
                      {template.roles.map((role) => (
                        <option key={role}>{role}</option>
                      ))}
                    </select>
                    <ChevronDown size={18} />
                  </div>
                </label>
                <label className="field">
                  <span>Note for the host</span>
                  <div className="input-shell note-shell">
                    <MessageSquare size={22} />
                    <textarea
                      placeholder="Add a note or question"
                      value={neighborNote}
                      onChange={(event) => setNeighborNote(event.target.value)}
                    />
                  </div>
                </label>
                <button className="primary-action submit-rsvp" onClick={submitRsvp} type="button">
                  Send RSVP
                  <ChevronRight size={21} />
                </button>
                {submittedMessage && (
                  <div className="submit-confirmation">
                    <CheckCircle2 size={19} />
                    <span>{submittedMessage}</span>
                  </div>
                )}
              </section>

              <aside className="neighbor-summary">
                <section>
                  <h3>Your RSVP</h3>
                  <div className="summary-line">
                    <span>Status</span>
                    <strong>{rsvpStatus}</strong>
                  </div>
                  <div className="summary-line">
                    <span>Bringing</span>
                    <strong>{rsvpStatus === 'No' ? 'Not attending' : pledgedSupply || 'Not selected'}</strong>
                  </div>
                  <div className="summary-line">
                    <span>Helping</span>
                    <strong>{pledgedRole || 'Not this time'}</strong>
                  </div>
                </section>
                <section>
                  <h3>Still Needed</h3>
                  {stillNeededSupplies.length > 0 ? (
                    stillNeededSupplies.map((supply) => (
                      <div className="need-row" key={supply}>
                        <Gift size={17} />
                        <span>{supply}</span>
                      </div>
                    ))
                  ) : (
                    <p className="complete-note">All open supplies are covered.</p>
                  )}
                </section>
                <section className="host-card">
                  <h3>Questions?</h3>
                  <p>{hostName}</p>
                  <span>{hostPhone}</span>
                  <span>{hostEmail}</span>
                </section>
              </aside>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
