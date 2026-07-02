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
  Send,
  Settings,
  Sparkles,
  UserRoundCheck,
  Users,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import neighborhoodArt from './assets/neighborhood-evening.webp'
import './App.css'
import { isSupabaseConfigured, supabase } from './supabase'

type EventType =
  | 'Happy Hour'
  | 'Potluck'
  | 'Block Party'
  | 'Community Cleanup'
  | 'Book Club'
  | 'Game Night'
  | 'Custom'

type PlanningStep = 'Details' | 'Invite' | 'Review'
type AppMode = 'Organizer' | 'Message Center' | 'Run Sheet' | 'Neighbor RSVP'
type RsvpStatus = 'Yes' | 'Maybe' | 'No'
type MessageAudience = 'Everyone invited' | 'Yes and maybe' | 'Needs RSVP' | 'Supply helpers' | 'Volunteer roles'
type SaveState = 'idle' | 'saving' | 'saved' | 'error'
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
    label: 'Community Cleanup',
    duration: '9:00 AM - 11:30 AM',
    location: 'Trailhead Kiosk',
    bringNote: 'Bring gloves if you have them.',
    headline: 'Community Cleanup',
    description: 'A focused cleanup morning with teams, supplies, and a simple after-event thank you.',
    roles: ['Supply captain', 'Zone lead', 'Photo lead'],
    supplies: ['Gloves', 'Grabbers', 'Trash bags', 'Water bottles'],
    tasks: ['Choose cleanup zones', 'Request supplies', 'Assign team leads', 'Send safety reminder', 'Review and publish'],
    inviteTone: 'clear and motivating',
  },
  {
    label: 'Book Club',
    duration: '7:00 PM - 8:30 PM',
    location: 'Jordan Taylor Home',
    bringNote: 'Bring a snack or drink to share.',
    headline: 'Neighborhood Book Club',
    description: 'A low-key discussion night with a host, a book pick, and a simple snack plan.',
    roles: ['Host', 'Discussion starter', 'Snack lead'],
    supplies: ['Discussion questions', 'Tea', 'Dessert', 'Extra chairs'],
    tasks: ['Add book title', 'Confirm host', 'Share questions', 'Send reading reminder', 'Review and publish'],
    inviteTone: 'thoughtful and cozy',
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
  { label: 'Dashboard', icon: Home },
  { label: 'Events', icon: CalendarDays },
  { label: 'Neighbors', icon: Users },
  { label: 'Messages', icon: MessageSquare },
  { label: 'Checklists', icon: ClipboardList },
  { label: 'Settings', icon: Settings },
]

const initialRsvpRows: RsvpRow[] = [
  { name: 'Maya Chen', status: 'Yes', note: 'bringing sparkling water', supply: 'Cups', role: '' },
  { name: 'Andre Lewis', status: 'Yes', note: 'can help with setup', supply: 'Ice', role: 'Greeter' },
  { name: 'Priya Shah', status: 'Maybe', note: 'will confirm tomorrow', supply: '', role: '' },
  { name: 'Sam Rivera', status: 'Yes', note: 'bringing chips', supply: 'Appetizers', role: '' },
]

const eventSlug = 'neighborhood-event'
const defaultEventDraft: EventRow = {
  slug: eventSlug,
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
}

function App() {
  const [appMode, setAppMode] = useState<AppMode>('Organizer')
  const [activeStep, setActiveStep] = useState<PlanningStep>('Details')
  const [eventType, setEventType] = useState<EventType>(defaultEventDraft.event_type)
  const [eventName, setEventName] = useState(defaultEventDraft.name)
  const [date, setDate] = useState(defaultEventDraft.date_label)
  const [time, setTime] = useState(defaultEventDraft.time_label)
  const [location, setLocation] = useState(defaultEventDraft.location)
  const [rsvpDate, setRsvpDate] = useState(defaultEventDraft.rsvp_deadline)
  const [bringNote, setBringNote] = useState(defaultEventDraft.bring_note)
  const [hostName, setHostName] = useState(defaultEventDraft.host_name)
  const [hostEmail, setHostEmail] = useState(defaultEventDraft.host_email)
  const [hostPhone, setHostPhone] = useState(defaultEventDraft.host_phone)
  const [eventSaveStatus, setEventSaveStatus] = useState('Ready to save')
  const [eventSaveState, setEventSaveState] = useState<SaveState>('idle')
  const [selectedRoles, setSelectedRoles] = useState(['Greeter', 'Snack table'])
  const [copiedLabel, setCopiedLabel] = useState('')
  const [neighborName, setNeighborName] = useState('Maya Chen')
  const [rsvpStatus, setRsvpStatus] = useState<RsvpStatus>('Yes')
  const [pledgedSupply, setPledgedSupply] = useState(templateSafeDefaultSupply())
  const [pledgedRole, setPledgedRole] = useState('')
  const [neighborNote, setNeighborNote] = useState('Happy to help set up if needed.')
  const [submittedMessage, setSubmittedMessage] = useState('')
  const [messageAudience, setMessageAudience] = useState<MessageAudience>('Yes and maybe')
  const [messageBody, setMessageBody] = useState('')
  const [messageLog, setMessageLog] = useState<MessageLogItem[]>(() => {
    const storedMessages = window.localStorage.getItem('gatherkit-message-log')
    if (!storedMessages) return []

    try {
      return JSON.parse(storedMessages) as MessageLogItem[]
    } catch {
      return []
    }
  })
  const [dataStatus, setDataStatus] = useState(isSupabaseConfigured ? 'Connecting to Supabase...' : 'Local demo mode')
  const [checkedRunTasks, setCheckedRunTasks] = useState<string[]>(() => {
    const storedTasks = window.localStorage.getItem('gatherkit-run-tasks')
    if (!storedTasks) return ['confirm-location', 'post-welcome-sign']

    try {
      return JSON.parse(storedTasks) as string[]
    } catch {
      return ['confirm-location', 'post-welcome-sign']
    }
  })
  const [rsvpRows, setRsvpRows] = useState<RsvpRow[]>(() => {
    const storedRows = window.localStorage.getItem('gatherkit-rsvps')
    if (!storedRows) return initialRsvpRows

    try {
      return JSON.parse(storedRows) as RsvpRow[]
    } catch {
      return initialRsvpRows
    }
  })

  const template = useMemo(
    () => eventTemplates.find((item) => item.label === eventType) ?? eventTemplates[0],
    [eventType],
  )

  const completeTasks = template.tasks.slice(0, 3)
  const openTasks = template.tasks.slice(3)
  const inviteDraft = `${eventName} is happening ${date} from ${time} at ${location}. ${template.description} RSVP by ${rsvpDate}. ${bringNote}`
  const reminderDraft = `Quick reminder: ${eventName} is coming up at ${location}. ${bringNote} Reply with questions or update your RSVP before ${rsvpDate}.`
  const flyerDraft = `${eventName}\n${date}\n${time}\n${location}\n${bringNote}`
  const rsvpLink = 'gatherkit.local/e/neighborhood-event'
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

  useEffect(() => {
    if (!isSupabaseConfigured) {
      window.localStorage.setItem('gatherkit-rsvps', JSON.stringify(rsvpRows))
    }
  }, [rsvpRows])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      window.localStorage.setItem('gatherkit-run-tasks', JSON.stringify(checkedRunTasks))
    }
  }, [checkedRunTasks])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      window.localStorage.setItem('gatherkit-message-log', JSON.stringify(messageLog))
    }
  }, [messageLog])

  useEffect(() => {
    if (supabase) return

    const storedEvent = window.localStorage.getItem('gatherkit-event-draft')
    if (!storedEvent) return

    try {
      applyEventRow(JSON.parse(storedEvent) as EventRow)
      setEventSaveStatus('Loaded local draft')
      setEventSaveState('saved')
    } catch {
      setEventSaveStatus('Local draft could not be loaded')
      setEventSaveState('error')
    }
  }, [])

  useEffect(() => {
    if (!supabase) return

    let isMounted = true
    const client = supabase

    async function loadEvent() {
      const { data, error } = await client
        .from('gatherkit_events')
        .select('slug,event_type,name,date_label,time_label,location,rsvp_deadline,bring_note,host_name,host_phone,host_email')
        .eq('slug', eventSlug)
        .maybeSingle()

      if (!isMounted) return

      if (error) {
        setEventSaveStatus(`Event sync error: ${error.message}`)
        setEventSaveState('error')
        setDataStatus(`Supabase error: ${error.message}`)
        return
      }

      if (data) {
        applyEventRow(data as EventRow)
        setEventSaveStatus('Event loaded from Supabase')
        setEventSaveState('saved')
        return
      }

      await saveEventDetails('Event draft created in Supabase')
    }

    loadEvent()

    const channel = client
      .channel('event-details')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gatherkit_events', filter: `slug=eq.${eventSlug}` },
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
  }, [])

  useEffect(() => {
    if (!supabase) return

    let isMounted = true
    const client = supabase

    async function loadRsvps() {
      const { data, error } = await client
        .from('gatherkit_event_rsvps')
        .select('id,name,status,note,supply,role')
        .eq('event_slug', eventSlug)
        .order('updated_at', { ascending: false })

      if (!isMounted) return

      if (error) {
        setDataStatus(`Supabase error: ${error.message}`)
        return
      }

      if (data.length > 0) {
        setRsvpRows(data as RsvpRow[])
      } else {
        setRsvpRows(initialRsvpRows)
      }
      setDataStatus('Supabase realtime connected')
    }

    loadRsvps()

    const channel = client
      .channel('event-rsvps')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gatherkit_event_rsvps', filter: `event_slug=eq.${eventSlug}` },
        () => {
          loadRsvps()
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setDataStatus('Supabase realtime connected')
      })

    return () => {
      isMounted = false
      client.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    if (!supabase) return

    let isMounted = true
    const client = supabase

    async function loadMessages() {
      const { data, error } = await client
        .from('gatherkit_event_messages')
        .select('id,audience,body,recipient_count,created_at')
        .eq('event_slug', eventSlug)
        .order('created_at', { ascending: false })
        .limit(20)

      if (!isMounted) return

      if (error) {
        setDataStatus(`Supabase error: ${error.message}`)
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
      .channel('event-messages')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gatherkit_event_messages', filter: `event_slug=eq.${eventSlug}` },
        () => {
          loadMessages()
        },
      )
      .subscribe()

    return () => {
      isMounted = false
      client.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    if (!supabase) return

    let isMounted = true
    const client = supabase

    async function loadRunTasks() {
      const { data, error } = await client
        .from('gatherkit_event_tasks')
        .select('task_id,completed')
        .eq('event_slug', eventSlug)

      if (!isMounted) return

      if (error) {
        setDataStatus(`Supabase error: ${error.message}`)
        return
      }

      const completedIds = (data as RunTaskRow[]).filter((row) => row.completed).map((row) => row.task_id)
      setCheckedRunTasks(completedIds)
    }

    loadRunTasks()

    const channel = client
      .channel('event-run-tasks')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gatherkit_event_tasks', filter: `event_slug=eq.${eventSlug}` },
        () => {
          loadRunTasks()
        },
      )
      .subscribe()

    return () => {
      isMounted = false
      client.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    setMessageBody(suggestedMessage)
  }, [suggestedMessage])

  function handleTypeChange(nextType: EventType) {
    const nextTemplate = eventTemplates.find((item) => item.label === nextType) ?? eventTemplates[0]
    setEventType(nextType)
    setEventName(nextTemplate.headline)
    setTime(nextTemplate.duration)
    setLocation(nextTemplate.location)
    setBringNote(nextTemplate.bringNote)
    setSelectedRoles(nextTemplate.roles.slice(0, 2))
    setPledgedSupply(nextTemplate.supplies[0])
    setPledgedRole('')
  }

  function applyEventRow(row: EventRow) {
    const supportedType = eventTemplates.some((item) => item.label === row.event_type)
      ? row.event_type
      : defaultEventDraft.event_type

    setEventType(supportedType)
    setEventName(row.name || defaultEventDraft.name)
    setDate(row.date_label || defaultEventDraft.date_label)
    setTime(row.time_label || defaultEventDraft.time_label)
    setLocation(row.location || defaultEventDraft.location)
    setRsvpDate(row.rsvp_deadline || defaultEventDraft.rsvp_deadline)
    setBringNote(row.bring_note || defaultEventDraft.bring_note)
    setHostName(row.host_name || defaultEventDraft.host_name)
    setHostPhone(row.host_phone || defaultEventDraft.host_phone)
    setHostEmail(row.host_email || defaultEventDraft.host_email)
  }

  function buildEventDraft(): EventRow {
    return {
      slug: eventSlug,
      event_type: eventType,
      name: eventName.trim() || defaultEventDraft.name,
      date_label: date.trim() || defaultEventDraft.date_label,
      time_label: time.trim() || defaultEventDraft.time_label,
      location: location.trim() || defaultEventDraft.location,
      rsvp_deadline: rsvpDate.trim() || defaultEventDraft.rsvp_deadline,
      bring_note: bringNote.trim() || defaultEventDraft.bring_note,
      host_name: hostName.trim() || defaultEventDraft.host_name,
      host_phone: hostPhone.trim() || defaultEventDraft.host_phone,
      host_email: hostEmail.trim() || defaultEventDraft.host_email,
    }
  }

  async function saveEventDetails(successMessage = 'Event draft saved') {
    const eventDraft = buildEventDraft()
    setEventSaveState('saving')
    setEventSaveStatus('Saving event draft...')

    if (!supabase) {
      window.localStorage.setItem('gatherkit-event-draft', JSON.stringify(eventDraft))
      setEventSaveStatus('Event draft saved locally')
      setEventSaveState('saved')
      return true
    }

    const { data: host, error: hostError } = await supabase
      .from('gatherkit_hosts')
      .upsert(
        {
          display_name: eventDraft.host_name,
          email: eventDraft.host_email,
          phone: eventDraft.host_phone,
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

    const { error } = await supabase.from('gatherkit_events').upsert(
      {
        host_id: host.id,
        ...eventDraft,
      },
      { onConflict: 'slug' },
    )

    if (error) {
      setEventSaveStatus(`Event sync error: ${error.message}`)
      setEventSaveState('error')
      return false
    }

    setEventSaveStatus(successMessage)
    setEventSaveState('saved')
    return true
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
    const saved = await saveEventDetails(activeStep === 'Review' ? 'Event saved and ready' : 'Event draft saved')
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
    const nextRow: RsvpRow = {
      name: neighborName.trim() || 'Neighbor',
      status: rsvpStatus,
      note: neighborNote.trim() || 'No note',
      supply: rsvpStatus === 'No' ? '' : pledgedSupply,
      role: rsvpStatus === 'No' ? '' : pledgedRole,
    }

    if (supabase) {
      const { error } = await supabase.from('gatherkit_event_rsvps').upsert(
        {
          event_slug: eventSlug,
          ...nextRow,
        },
        { onConflict: 'event_slug,name' },
      )

      if (error) {
        setSubmittedMessage(`Supabase error: ${error.message}`)
        window.setTimeout(() => setSubmittedMessage(''), 3200)
        return
      }

      setSubmittedMessage(`${nextRow.name}'s RSVP is live in Supabase.`)
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
    const nextMessage: MessageLogItem = {
      audience,
      body,
      count,
      sentAt: 'just now',
    }

    setMessageLog((items) => [nextMessage, ...items])

    if (supabase) {
      const { error } = await supabase.from('gatherkit_event_messages').insert({
        event_slug: eventSlug,
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
    const nextCompleted = !checkedRunTasks.includes(taskId)

    setCheckedRunTasks((taskIds) =>
      nextCompleted ? [...taskIds, taskId] : taskIds.filter((id) => id !== taskId),
    )

    if (supabase) {
      const { error } = await supabase.from('gatherkit_event_tasks').upsert(
        {
          event_slug: eventSlug,
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

  function templateSafeDefaultSupply() {
    return eventTemplates[0].supplies[0]
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-art">
          <img src={neighborhoodArt} alt="Evening neighborhood houses" />
        </div>
        <div className="brand-copy">
          <p className="eyebrow">GatherKit</p>
          <h1>Our Neighborhood</h1>
          <span>Stronger together.</span>
        </div>

        <nav aria-label="Primary">
          {navItems.map((item, index) => {
            const Icon = item.icon
            return (
              <button className={index === 0 ? 'nav-item active' : 'nav-item'} key={item.label} type="button">
                <Icon size={21} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="neighbor-note">
          <Sparkles size={24} />
          <strong>3 drafts ready</strong>
          <span>Invite, reminder, and supply signup are waiting.</span>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <button className="icon-button" type="button" aria-label="Open menu">
            <Menu />
          </button>
          <div className="topbar-copy">
            <h2>Hello, Jordan</h2>
            <p>Here is what is happening in your neighborhood.</p>
          </div>
          <div className={isSupabaseConfigured ? 'data-pill connected' : 'data-pill'}>
            {dataStatus}
          </div>
          <div className="mode-toggle" aria-label="View mode">
            {(['Organizer', 'Message Center', 'Run Sheet', 'Neighbor RSVP'] as AppMode[]).map((mode) => (
              <button
                className={appMode === mode ? 'selected' : ''}
                key={mode}
                onClick={() => setAppMode(mode)}
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
          </div>
          <div className="topbar-actions">
            <button className="bell-button" type="button" aria-label="Notifications">
              <Bell />
              <span>2</span>
            </button>
            <div className="profile-chip">
              <div className="avatar">JT</div>
              <span>Jordan</span>
              <ChevronDown size={18} />
            </div>
          </div>
        </header>

        {appMode === 'Organizer' ? (
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
                      <input value={date} onChange={(event) => setDate(event.target.value)} />
                    </div>
                  </label>

                  <label className="field">
                    <span>Time</span>
                    <div className="input-shell">
                      <Clock3 size={22} />
                      <input value={time} onChange={(event) => setTime(event.target.value)} />
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
                      <input value={rsvpDate} onChange={(event) => setRsvpDate(event.target.value)} />
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
                    onClick={() => saveEventDetails('Event published in Supabase')}
                    type="button"
                  >
                    Publish Event
                    <ChevronRight size={21} />
                  </button>
                </section>
                <section className="review-grid">
                  <article>
                    <h3>Organizer Packet</h3>
                    <p>Invite copy, text reminder, flyer copy, RSVP link, and supply signup.</p>
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
                  {activeStep === 'Review' ? 'Create Event' : 'Continue'}
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
                    <input value={neighborName} onChange={(event) => setNeighborName(event.target.value)} />
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
                    <textarea value={neighborNote} onChange={(event) => setNeighborNote(event.target.value)} />
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
                    <strong>{pledgedSupply}</strong>
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
