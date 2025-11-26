import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  X,
  Video,
  Phone,
  Link2,
  AlertCircle,
} from 'lucide-react';
import { CRMCalendarEvent } from '../../types';
import {
  isGoogleConnected,
  signInWithGoogle,
  fetchCalendarEvents,
  createCalendarEvent,
} from '../../services/googleWorkspaceService';

const CRMCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [events, setEvents] = useState<CRMCalendarEvent[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CRMCalendarEvent | null>(null);
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [googleConnected, setGoogleConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Mock events for demo
  const mockEvents: CRMCalendarEvent[] = [
    {
      id: '1',
      organization_id: 'org-1',
      title: 'Property Inspection - Johnson',
      description: 'Initial roof inspection for hail damage assessment',
      location: '1234 Oak Street, Dallas, TX',
      start_time: new Date(currentDate.getFullYear(), currentDate.getMonth(), 15, 10, 0).toISOString(),
      end_time: new Date(currentDate.getFullYear(), currentDate.getMonth(), 15, 11, 30).toISOString(),
      all_day: false,
      event_type: 'inspection',
      color: '1',
      attendees: [{ email: 'john@email.com', name: 'John Smith' }],
      is_synced: false,
      created_by: 'user-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '2',
      organization_id: 'org-1',
      title: 'Adjuster Meeting - State Farm',
      description: 'Review claim details with insurance adjuster',
      location: 'Zoom Meeting',
      start_time: new Date(currentDate.getFullYear(), currentDate.getMonth(), 18, 14, 0).toISOString(),
      end_time: new Date(currentDate.getFullYear(), currentDate.getMonth(), 18, 15, 0).toISOString(),
      all_day: false,
      event_type: 'meeting',
      color: '2',
      attendees: [
        { email: 'mike@statefarm.com', name: 'Mike Williams' },
        { email: 'admin@estimatereliance.com', name: 'Admin' },
      ],
      is_synced: true,
      created_by: 'user-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '3',
      organization_id: 'org-1',
      title: 'Final Walkthrough - Davis',
      description: 'Final inspection before project completion',
      location: '890 Elm Drive, Arlington, TX',
      start_time: new Date(currentDate.getFullYear(), currentDate.getMonth(), 20, 9, 0).toISOString(),
      end_time: new Date(currentDate.getFullYear(), currentDate.getMonth(), 20, 10, 0).toISOString(),
      all_day: false,
      event_type: 'appointment',
      color: '3',
      is_synced: false,
      created_by: 'user-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '4',
      organization_id: 'org-1',
      title: 'Supplement Deadline',
      description: 'Submit supplement claim to insurance',
      start_time: new Date(currentDate.getFullYear(), currentDate.getMonth(), 22, 0, 0).toISOString(),
      end_time: new Date(currentDate.getFullYear(), currentDate.getMonth(), 22, 23, 59).toISOString(),
      all_day: true,
      event_type: 'deadline',
      color: '4',
      is_synced: false,
      created_by: 'user-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '5',
      organization_id: 'org-1',
      title: 'Team Meeting',
      description: 'Weekly team sync',
      location: 'Office',
      start_time: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 9, 0).toISOString(),
      end_time: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 10, 0).toISOString(),
      all_day: false,
      event_type: 'meeting',
      color: '5',
      is_synced: true,
      created_by: 'user-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  useEffect(() => {
    setGoogleConnected(isGoogleConnected());
    setEvents(mockEvents);
  }, []);

  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    location: '',
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    all_day: false,
    event_type: 'appointment' as CRMCalendarEvent['event_type'],
    attendees: '',
  });

  const handleConnectGoogle = async () => {
    setIsLoading(true);
    try {
      const credentials = await signInWithGoogle();
      if (credentials) {
        setGoogleConnected(true);
        const googleEvents = await fetchCalendarEvents();
        setEvents([...mockEvents, ...googleEvents]);
      }
    } catch (error) {
      console.error('Failed to connect Google:', error);
    }
    setIsLoading(false);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Add empty slots for days before the first day of the month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const getEventsForDate = (date: Date) => {
    return events.filter((event) => {
      const eventDate = new Date(event.start_time);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getEventTypeColor = (type: CRMCalendarEvent['event_type']) => {
    const colors: Record<CRMCalendarEvent['event_type'], string> = {
      inspection: 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300',
      meeting: 'bg-purple-500/20 border-purple-500/50 text-purple-300',
      appointment: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300',
      follow_up: 'bg-amber-500/20 border-amber-500/50 text-amber-300',
      deadline: 'bg-rose-500/20 border-rose-500/50 text-rose-300',
      other: 'bg-slate-500/20 border-slate-500/50 text-slate-300',
    };
    return colors[type];
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + (direction === 'next' ? 1 : -1), 1)
    );
  };

  const days = getDaysInMonth(currentDate);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-white">Calendar</h1>
          <div className="flex items-center gap-1 bg-slate-800/50 rounded-xl p-1">
            {(['month', 'week', 'day'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  view === v
                    ? 'bg-cyan-500/20 text-cyan-300'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!googleConnected && (
            <button
              onClick={handleConnectGoogle}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-white/10 text-white rounded-xl text-sm hover:bg-slate-700 transition-all"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {isLoading ? 'Connecting...' : 'Connect Google Calendar'}
            </button>
          )}
          {googleConnected && (
            <span className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 text-emerald-300 rounded-lg text-sm">
              <div className="w-2 h-2 bg-emerald-500 rounded-full" />
              Google Connected
            </span>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl font-medium text-sm transition-all shadow-lg shadow-cyan-500/25"
          >
            <Plus className="w-4 h-4" />
            New Event
          </button>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="flex items-center justify-between bg-slate-800/50 rounded-xl px-4 py-3 border border-white/10">
        <button
          onClick={() => navigateMonth('prev')}
          className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold text-white">
          {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h2>
        <button
          onClick={() => navigateMonth('next')}
          className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="bg-slate-800/50 rounded-2xl border border-white/10 overflow-hidden">
        {/* Week Day Headers */}
        <div className="grid grid-cols-7 border-b border-white/10">
          {weekDays.map((day) => (
            <div
              key={day}
              className="p-3 text-center text-sm font-medium text-slate-400 bg-slate-800/50"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {days.map((date, index) => (
            <div
              key={index}
              className={`min-h-[120px] p-2 border-b border-r border-white/5 ${
                !date ? 'bg-slate-900/30' : 'hover:bg-white/5 cursor-pointer'
              } ${date && isToday(date) ? 'bg-cyan-500/5' : ''}`}
              onClick={() => date && setSelectedDate(date)}
            >
              {date && (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`w-7 h-7 flex items-center justify-center rounded-full text-sm ${
                        isToday(date)
                          ? 'bg-cyan-500 text-white font-bold'
                          : 'text-slate-300'
                      }`}
                    >
                      {date.getDate()}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {getEventsForDate(date).slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(event);
                        }}
                        className={`px-2 py-1 rounded text-xs truncate border ${getEventTypeColor(event.event_type)} cursor-pointer hover:opacity-80 transition-opacity`}
                      >
                        {!event.all_day && (
                          <span className="font-medium mr-1">{formatTime(event.start_time)}</span>
                        )}
                        {event.title}
                      </div>
                    ))}
                    {getEventsForDate(date).length > 3 && (
                      <p className="text-xs text-slate-500 pl-2">
                        +{getEventsForDate(date).length - 3} more
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Today's Events Sidebar */}
      <div className="bg-slate-800/50 rounded-2xl border border-white/10 p-5">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-cyan-400" />
          Today's Events
        </h3>
        <div className="space-y-3">
          {getEventsForDate(new Date()).length === 0 ? (
            <p className="text-slate-400 text-sm">No events scheduled for today</p>
          ) : (
            getEventsForDate(new Date()).map((event) => (
              <div
                key={event.id}
                onClick={() => setSelectedEvent(event)}
                className={`p-3 rounded-xl border cursor-pointer hover:opacity-90 transition-all ${getEventTypeColor(event.event_type)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{event.title}</h4>
                    {!event.all_day && (
                      <p className="text-sm opacity-80 flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(event.start_time)} - {formatTime(event.end_time)}
                      </p>
                    )}
                    {event.location && (
                      <p className="text-sm opacity-80 flex items-center gap-1 mt-1 truncate">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        {event.location}
                      </p>
                    )}
                  </div>
                  {event.is_synced && (
                    <span className="px-2 py-0.5 bg-white/10 rounded text-xs">
                      Synced
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-white/10 rounded-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">{selectedEvent.title}</h2>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-lg text-sm font-medium capitalize ${getEventTypeColor(selectedEvent.event_type)}`}>
                  {selectedEvent.event_type.replace('_', ' ')}
                </span>
                {selectedEvent.is_synced && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded text-xs">
                    <Link2 className="w-3 h-3" />
                    Google Synced
                  </span>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-white">
                      {selectedEvent.all_day
                        ? 'All Day'
                        : `${formatTime(selectedEvent.start_time)} - ${formatTime(selectedEvent.end_time)}`}
                    </p>
                    <p className="text-slate-400 text-sm">
                      {new Date(selectedEvent.start_time).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                {selectedEvent.location && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
                    <p className="text-white">{selectedEvent.location}</p>
                  </div>
                )}

                {selectedEvent.description && (
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-slate-400 mt-0.5" />
                    <p className="text-slate-300">{selectedEvent.description}</p>
                  </div>
                )}

                {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-slate-400 mt-0.5" />
                    <div className="flex flex-wrap gap-2">
                      {selectedEvent.attendees.map((attendee, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-slate-700/50 text-slate-300 rounded text-sm"
                        >
                          {attendee.name || attendee.email}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/10">
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-cyan-500/20 text-cyan-300 rounded-xl hover:bg-cyan-500/30 transition-colors">
                  <Video className="w-4 h-4" />
                  Join Meeting
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-700/50 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors">
                  Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">Create Event</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Event Title</label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                  placeholder="e.g., Property Inspection"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Event Type</label>
                <select
                  value={newEvent.event_type}
                  onChange={(e) => setNewEvent({ ...newEvent, event_type: e.target.value as any })}
                  className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                >
                  <option value="appointment">Appointment</option>
                  <option value="inspection">Inspection</option>
                  <option value="meeting">Meeting</option>
                  <option value="follow_up">Follow Up</option>
                  <option value="deadline">Deadline</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="all_day"
                  checked={newEvent.all_day}
                  onChange={(e) => setNewEvent({ ...newEvent, all_day: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500/25"
                />
                <label htmlFor="all_day" className="text-sm text-slate-300">All day event</label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={newEvent.start_date}
                    onChange={(e) => setNewEvent({ ...newEvent, start_date: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                {!newEvent.all_day && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Start Time</label>
                    <input
                      type="time"
                      value={newEvent.start_time}
                      onChange={(e) => setNewEvent({ ...newEvent, start_time: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                )}
              </div>

              {!newEvent.all_day && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">End Date</label>
                    <input
                      type="date"
                      value={newEvent.end_date}
                      onChange={(e) => setNewEvent({ ...newEvent, end_date: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">End Time</label>
                    <input
                      type="time"
                      value={newEvent.end_time}
                      onChange={(e) => setNewEvent({ ...newEvent, end_time: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Location</label>
                <input
                  type="text"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                  placeholder="e.g., 1234 Main St or Zoom"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Attendees (comma separated emails)</label>
                <input
                  type="text"
                  value={newEvent.attendees}
                  onChange={(e) => setNewEvent({ ...newEvent, attendees: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                  placeholder="john@email.com, jane@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                <textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 resize-none"
                  placeholder="Add event details..."
                />
              </div>

              {googleConnected && (
                <div className="flex items-center gap-2 p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
                  <Link2 className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm text-cyan-300">This event will sync to Google Calendar</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/10">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl font-medium transition-all">
                Create Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRMCalendar;
