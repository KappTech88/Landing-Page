// Google Workspace Integration Service
// Handles Gmail and Calendar API integration

import { CRMEmail, CRMCalendarEvent, GoogleWorkspaceCredentials } from '../types';

// Google API Configuration
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ');

// Storage keys
const STORAGE_KEY = 'google_workspace_credentials';

// ============= Authentication =============

export const initGoogleAuth = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => {
      window.gapi.load('client:auth2', async () => {
        try {
          await window.gapi.client.init({
            apiKey: GOOGLE_API_KEY,
            clientId: GOOGLE_CLIENT_ID,
            scope: SCOPES,
            discoveryDocs: [
              'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest',
              'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
            ],
          });
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    };
    script.onerror = reject;
    document.body.appendChild(script);
  });
};

export const signInWithGoogle = async (): Promise<GoogleWorkspaceCredentials | null> => {
  try {
    const authInstance = window.gapi.auth2.getAuthInstance();
    const user = await authInstance.signIn();
    const authResponse = user.getAuthResponse(true);
    const profile = user.getBasicProfile();

    const credentials: GoogleWorkspaceCredentials = {
      access_token: authResponse.access_token,
      refresh_token: authResponse.refresh_token,
      expires_at: authResponse.expires_at,
      scope: SCOPES,
      email: profile.getEmail(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(credentials));
    return credentials;
  } catch (error) {
    console.error('Google sign-in error:', error);
    return null;
  }
};

export const signOutGoogle = async (): Promise<void> => {
  try {
    const authInstance = window.gapi.auth2.getAuthInstance();
    await authInstance.signOut();
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Google sign-out error:', error);
  }
};

export const getStoredCredentials = (): GoogleWorkspaceCredentials | null => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const credentials = JSON.parse(stored);
    if (credentials.expires_at && credentials.expires_at > Date.now()) {
      return credentials;
    }
    localStorage.removeItem(STORAGE_KEY);
  }
  return null;
};

export const isGoogleConnected = (): boolean => {
  return getStoredCredentials() !== null;
};

// ============= Gmail API =============

export const fetchEmails = async (
  maxResults: number = 50,
  query?: string,
  labelIds: string[] = ['INBOX']
): Promise<CRMEmail[]> => {
  try {
    const response = await window.gapi.client.gmail.users.messages.list({
      userId: 'me',
      maxResults,
      q: query,
      labelIds,
    });

    const messages = response.result.messages || [];
    const emails: CRMEmail[] = [];

    for (const msg of messages.slice(0, 20)) { // Limit to 20 for performance
      const detail = await window.gapi.client.gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'full',
      });

      const email = parseGmailMessage(detail.result);
      if (email) emails.push(email);
    }

    return emails;
  } catch (error) {
    console.error('Error fetching emails:', error);
    return [];
  }
};

export const sendEmail = async (
  to: string[],
  subject: string,
  body: string,
  cc?: string[],
  bcc?: string[]
): Promise<boolean> => {
  try {
    const credentials = getStoredCredentials();
    if (!credentials) throw new Error('Not authenticated');

    const headers = [
      `To: ${to.join(', ')}`,
      `Subject: ${subject}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
    ];

    if (cc?.length) headers.push(`Cc: ${cc.join(', ')}`);
    if (bcc?.length) headers.push(`Bcc: ${bcc.join(', ')}`);

    const email = headers.join('\r\n') + '\r\n\r\n' + body;
    const encodedEmail = btoa(unescape(encodeURIComponent(email)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    await window.gapi.client.gmail.users.messages.send({
      userId: 'me',
      resource: { raw: encodedEmail },
    });

    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

export const markEmailAsRead = async (messageId: string): Promise<boolean> => {
  try {
    await window.gapi.client.gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      resource: { removeLabelIds: ['UNREAD'] },
    });
    return true;
  } catch (error) {
    console.error('Error marking email as read:', error);
    return false;
  }
};

export const starEmail = async (messageId: string, starred: boolean): Promise<boolean> => {
  try {
    await window.gapi.client.gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      resource: starred
        ? { addLabelIds: ['STARRED'] }
        : { removeLabelIds: ['STARRED'] },
    });
    return true;
  } catch (error) {
    console.error('Error starring email:', error);
    return false;
  }
};

const parseGmailMessage = (message: any): CRMEmail | null => {
  try {
    const headers = message.payload?.headers || [];
    const getHeader = (name: string) =>
      headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    const fromHeader = getHeader('From');
    const fromMatch = fromHeader.match(/^(?:"?([^"<]*)"?\s*)?<?([^>]+)>?$/);

    let bodyText = '';
    let bodyHtml = '';

    const extractBody = (parts: any[]): void => {
      for (const part of parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          bodyText = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        } else if (part.mimeType === 'text/html' && part.body?.data) {
          bodyHtml = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        } else if (part.parts) {
          extractBody(part.parts);
        }
      }
    };

    if (message.payload?.parts) {
      extractBody(message.payload.parts);
    } else if (message.payload?.body?.data) {
      const decoded = atob(message.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      if (message.payload.mimeType === 'text/html') {
        bodyHtml = decoded;
      } else {
        bodyText = decoded;
      }
    }

    return {
      id: message.id,
      organization_id: '',
      gmail_message_id: message.id,
      gmail_thread_id: message.threadId,
      from_email: fromMatch?.[2] || fromHeader,
      from_name: fromMatch?.[1]?.trim(),
      to_emails: getHeader('To').split(',').map((e: string) => e.trim()),
      cc_emails: getHeader('Cc') ? getHeader('Cc').split(',').map((e: string) => e.trim()) : undefined,
      subject: getHeader('Subject'),
      body_text: bodyText,
      body_html: bodyHtml,
      snippet: message.snippet,
      is_read: !message.labelIds?.includes('UNREAD'),
      is_starred: message.labelIds?.includes('STARRED'),
      is_sent: message.labelIds?.includes('SENT'),
      is_draft: message.labelIds?.includes('DRAFT'),
      has_attachments: message.payload?.parts?.some((p: any) => p.filename) || false,
      labels: message.labelIds,
      received_at: new Date(parseInt(message.internalDate)).toISOString(),
      created_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error parsing Gmail message:', error);
    return null;
  }
};

// ============= Calendar API =============

export const fetchCalendarEvents = async (
  timeMin?: Date,
  timeMax?: Date,
  maxResults: number = 100
): Promise<CRMCalendarEvent[]> => {
  try {
    const now = new Date();
    const response = await window.gapi.client.calendar.events.list({
      calendarId: 'primary',
      timeMin: (timeMin || new Date(now.getFullYear(), now.getMonth(), 1)).toISOString(),
      timeMax: (timeMax || new Date(now.getFullYear(), now.getMonth() + 2, 0)).toISOString(),
      maxResults,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.result.items || [];
    return events.map((event: any) => parseCalendarEvent(event)).filter(Boolean) as CRMCalendarEvent[];
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return [];
  }
};

export const createCalendarEvent = async (
  event: Partial<CRMCalendarEvent>
): Promise<CRMCalendarEvent | null> => {
  try {
    const googleEvent = {
      summary: event.title,
      description: event.description,
      location: event.location,
      start: event.all_day
        ? { date: event.start_time?.split('T')[0] }
        : { dateTime: event.start_time, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      end: event.all_day
        ? { date: event.end_time?.split('T')[0] }
        : { dateTime: event.end_time, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      attendees: event.attendees?.map(a => ({ email: a.email, displayName: a.name })),
      reminders: event.reminder_minutes
        ? { useDefault: false, overrides: [{ method: 'popup', minutes: event.reminder_minutes }] }
        : { useDefault: true },
      colorId: event.color,
    };

    const response = await window.gapi.client.calendar.events.insert({
      calendarId: 'primary',
      resource: googleEvent,
      sendUpdates: 'all',
    });

    return parseCalendarEvent(response.result);
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return null;
  }
};

export const updateCalendarEvent = async (
  eventId: string,
  updates: Partial<CRMCalendarEvent>
): Promise<CRMCalendarEvent | null> => {
  try {
    const googleEvent: any = {};

    if (updates.title) googleEvent.summary = updates.title;
    if (updates.description) googleEvent.description = updates.description;
    if (updates.location) googleEvent.location = updates.location;
    if (updates.start_time) {
      googleEvent.start = updates.all_day
        ? { date: updates.start_time.split('T')[0] }
        : { dateTime: updates.start_time, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
    }
    if (updates.end_time) {
      googleEvent.end = updates.all_day
        ? { date: updates.end_time.split('T')[0] }
        : { dateTime: updates.end_time, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
    }
    if (updates.attendees) {
      googleEvent.attendees = updates.attendees.map(a => ({ email: a.email, displayName: a.name }));
    }

    const response = await window.gapi.client.calendar.events.patch({
      calendarId: 'primary',
      eventId,
      resource: googleEvent,
      sendUpdates: 'all',
    });

    return parseCalendarEvent(response.result);
  } catch (error) {
    console.error('Error updating calendar event:', error);
    return null;
  }
};

export const deleteCalendarEvent = async (eventId: string): Promise<boolean> => {
  try {
    await window.gapi.client.calendar.events.delete({
      calendarId: 'primary',
      eventId,
      sendUpdates: 'all',
    });
    return true;
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    return false;
  }
};

const parseCalendarEvent = (event: any): CRMCalendarEvent | null => {
  try {
    const isAllDay = !event.start?.dateTime;

    return {
      id: event.id,
      organization_id: '',
      google_event_id: event.id,
      title: event.summary || 'Untitled',
      description: event.description,
      location: event.location,
      start_time: isAllDay ? `${event.start.date}T00:00:00` : event.start.dateTime,
      end_time: isAllDay ? `${event.end.date}T23:59:59` : event.end.dateTime,
      all_day: isAllDay,
      color: event.colorId,
      event_type: 'other',
      attendees: event.attendees?.map((a: any) => ({
        email: a.email,
        name: a.displayName,
        status: a.responseStatus,
      })),
      is_synced: true,
      created_by: event.creator?.email || '',
      created_at: event.created,
      updated_at: event.updated,
    };
  } catch (error) {
    console.error('Error parsing calendar event:', error);
    return null;
  }
};

// Extend Window interface for gapi
declare global {
  interface Window {
    gapi: any;
  }
}
