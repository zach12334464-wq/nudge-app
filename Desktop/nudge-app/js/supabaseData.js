import { supabase, getUser, getProfile } from './supabaseClient.js';

// ── Tasks ─────────────────────────────────────
export async function getTasks(companyId) {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch(e) {
    console.warn('Supabase failed, using DEMO', e);
    return window.DEMO?.tasks || window.DEMO?.TASKS || [];
  }
}

export async function createTask(companyId, userId, taskData) {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        company_id: companyId,
        user_id: userId,
        title: taskData.title,
        status: taskData.status || 'todo',
        priority: taskData.priority || 'medium',
        assignee: taskData.assignee || null
      })
      .select()
      .single();
    if (error) throw error;
    return data || null;
  } catch(e) {
    console.warn('Supabase failed, using DEMO', e);
    return null;
  }
}

export async function updateTask(taskId, updates) {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .select()
      .single();
    if (error) throw error;
    return data || null;
  } catch(e) {
    console.warn('Supabase failed, using DEMO', e);
    return null;
  }
}

export async function lockTask(taskId, lockedBy) {
  try {
    return await updateTask(taskId, {
      locked_by: lockedBy,
      locked_at: new Date().toISOString(),
      status: 'in-progress'
    });
  } catch(e) {
    console.warn('Supabase failed, using DEMO', e);
    return null;
  }
}

export async function completeTask(taskId, completedBy) {
  try {
    return await updateTask(taskId, {
      completed_by: completedBy,
      completed_at: new Date().toISOString(),
      locked_by: null,
      status: 'done'
    });
  } catch(e) {
    console.warn('Supabase failed, using DEMO', e);
    return null;
  }
}

// ── Chat messages ─────────────────────────────
export async function getChatMessages(companyId) {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: true })
      .limit(100);
    if (error) throw error;
    return data || [];
  } catch(e) {
    console.warn('Supabase failed, using DEMO', e);
    return window.DEMO?.chatMessages || window.DEMO?.CHAT || [];
  }
}

export async function sendChatMessage(companyId, author, initials, text) {
  try {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        company_id: companyId,
        author,
        initials,
        text,
        time: timeStr
      })
      .select()
      .single();
    if (error) throw error;
    return data || null;
  } catch(e) {
    console.warn('Supabase failed, using DEMO', e);
    return null;
  }
}

// ── Real-time chat subscription ───────────────
export function subscribeToChatMessages(companyId, callback) {
  try {
    return supabase
      .channel('chat_messages_' + companyId)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `company_id=eq.${companyId}`
      }, payload => {
        callback(payload.new);
      })
      .subscribe();
  } catch(e) {
    console.warn('Supabase failed, using DEMO', e);
    return { unsubscribe: () => {} };
  }
}

// ── Actions (approvals) ───────────────────────
export async function getActions(companyId) {
  try {
    const { data, error } = await supabase
      .from('actions')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch(e) {
    console.warn('Supabase failed, using DEMO', e);
    return window.DEMO?.actions || [];
  }
}

export async function updateAction(actionId, status) {
  try {
    const { data, error } = await supabase
      .from('actions')
      .update({ status })
      .eq('id', actionId)
      .select()
      .single();
    if (error) throw error;
    return data || null;
  } catch(e) {
    console.warn('Supabase failed, using DEMO', e);
    return null;
  }
}

// ── Schedule ──────────────────────────────────
export async function getSchedule(companyId) {
  try {
    const { data, error } = await supabase
      .from('schedule_blocks')
      .select('*')
      .eq('company_id', companyId)
      .order('date', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch(e) {
    console.warn('Supabase failed, using DEMO', e);
    return window.DEMO?.schedule || [];
  }
}

export async function createScheduleBlock(companyId, blockData) {
  try {
    const { data, error } = await supabase
      .from('schedule_blocks')
      .insert({
        company_id: companyId,
        title: blockData.title,
        date: blockData.date,
        start_time: blockData.start,
        end_time: blockData.end,
        source: blockData.source || 'manual'
      })
      .select()
      .single();
    if (error) throw error;
    return data || null;
  } catch(e) {
    console.warn('Supabase failed, using DEMO', e);
    return null;
  }
}

// ── Departments ───────────────────────────────
export async function getDepartments() {
  try {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .order('name');
    if (error) throw error;
    return data || [];
  } catch(e) {
    console.warn('Supabase failed, using DEMO', e);
    return window.DEMO?.departments || [];
  }
}

// ── Team members ──────────────────────────────
export async function getTeamMembers(companyId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('company_id', companyId);
    if (error) throw error;
    return data || [];
  } catch(e) {
    console.warn('Supabase failed, using DEMO', e);
    return window.DEMO?.profiles || window.DEMO?.TEAM || [];
  }
}

// ── Connected emails ──────────────────────────
export async function getConnectedEmails(companyId) {
  try {
    const { data, error } = await supabase
      .from('connected_emails')
      .select('*')
      .eq('company_id', companyId);
    if (error) throw error;
    return data || [];
  } catch(e) {
    console.warn('Supabase failed, using DEMO', e);
    return window.DEMO?.connectedEmails || [];
  }
}

export { getUser, getProfile };
