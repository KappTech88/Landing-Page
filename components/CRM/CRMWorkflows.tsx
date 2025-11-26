import React, { useState } from 'react';
import {
  GitBranch,
  Plus,
  Play,
  Pause,
  Settings,
  Trash2,
  Copy,
  ChevronRight,
  Mail,
  CheckSquare,
  Calendar,
  MessageSquare,
  User,
  Bell,
  ArrowRight,
  Zap,
  Clock,
  X,
  Edit2,
  MoreVertical,
  AlertCircle,
  FileText,
  Phone,
} from 'lucide-react';
import { CRMWorkflow, CRMWorkflowAction, WorkflowTrigger, WorkflowAction } from '../../types';

const CRMWorkflows: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<CRMWorkflow | null>(null);
  const [editMode, setEditMode] = useState(false);

  const [workflows, setWorkflows] = useState<CRMWorkflow[]>([
    {
      id: '1',
      organization_id: 'org-1',
      name: 'New Lead Follow-up',
      description: 'Automatically send welcome email and create follow-up task when a new lead is added',
      is_active: true,
      trigger: 'claim_created',
      trigger_conditions: { claim_type: 'any' },
      actions: [
        {
          id: 'a1',
          action_type: 'send_email',
          action_config: {
            template: 'welcome_email',
            subject: 'Thank you for contacting Estimate Reliance',
          },
          delay_minutes: 0,
          order: 1,
        },
        {
          id: 'a2',
          action_type: 'create_task',
          action_config: {
            title: 'Follow up call with new lead',
            priority: 'high',
            due_days: 1,
          },
          delay_minutes: 5,
          order: 2,
        },
        {
          id: 'a3',
          action_type: 'add_note',
          action_config: {
            content: 'Lead received - automated workflow initiated',
          },
          delay_minutes: 0,
          order: 3,
        },
      ],
      created_by: 'user-1',
      created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '2',
      organization_id: 'org-1',
      name: 'Claim Status Update Notification',
      description: 'Notify client when claim status changes',
      is_active: true,
      trigger: 'status_changed',
      trigger_conditions: { statuses: ['approved', 'work_in_progress', 'closed'] },
      actions: [
        {
          id: 'b1',
          action_type: 'send_email',
          action_config: {
            template: 'status_update',
            subject: 'Your Claim Status Has Been Updated',
          },
          delay_minutes: 0,
          order: 1,
        },
        {
          id: 'b2',
          action_type: 'send_sms',
          action_config: {
            template: 'status_sms',
          },
          delay_minutes: 5,
          order: 2,
        },
      ],
      created_by: 'user-1',
      created_at: new Date(Date.now() - 86400000 * 15).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '3',
      organization_id: 'org-1',
      name: 'Appointment Reminder',
      description: 'Send reminder before scheduled appointments',
      is_active: true,
      trigger: 'appointment_scheduled',
      actions: [
        {
          id: 'c1',
          action_type: 'send_email',
          action_config: {
            template: 'appointment_reminder',
            subject: 'Reminder: Your Appointment Tomorrow',
            send_before_hours: 24,
          },
          delay_minutes: 0,
          order: 1,
        },
        {
          id: 'c2',
          action_type: 'send_sms',
          action_config: {
            template: 'appointment_sms',
            send_before_hours: 2,
          },
          delay_minutes: 0,
          order: 2,
        },
      ],
      created_by: 'user-1',
      created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '4',
      organization_id: 'org-1',
      name: 'Task Completion Follow-up',
      description: 'Create next task when inspection is completed',
      is_active: false,
      trigger: 'task_completed',
      trigger_conditions: { task_type: 'inspection' },
      actions: [
        {
          id: 'd1',
          action_type: 'create_task',
          action_config: {
            title: 'Submit estimate to insurance',
            priority: 'high',
            due_days: 2,
          },
          delay_minutes: 0,
          order: 1,
        },
        {
          id: 'd2',
          action_type: 'update_status',
          action_config: {
            new_status: 'estimate_in_progress',
          },
          delay_minutes: 0,
          order: 2,
        },
      ],
      created_by: 'user-1',
      created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]);

  const [newWorkflow, setNewWorkflow] = useState({
    name: '',
    description: '',
    trigger: 'claim_created' as WorkflowTrigger,
    actions: [] as CRMWorkflowAction[],
  });

  const triggerOptions: { value: WorkflowTrigger; label: string; icon: React.ReactNode; description: string }[] = [
    { value: 'claim_created', label: 'New Claim/Lead Created', icon: <Plus className="w-4 h-4" />, description: 'When a new claim or lead is added to the system' },
    { value: 'status_changed', label: 'Status Changed', icon: <GitBranch className="w-4 h-4" />, description: 'When a claim/job status is updated' },
    { value: 'task_completed', label: 'Task Completed', icon: <CheckSquare className="w-4 h-4" />, description: 'When a task is marked as completed' },
    { value: 'email_received', label: 'Email Received', icon: <Mail className="w-4 h-4" />, description: 'When an email is received from a contact' },
    { value: 'appointment_scheduled', label: 'Appointment Scheduled', icon: <Calendar className="w-4 h-4" />, description: 'When an appointment is scheduled' },
    { value: 'payment_received', label: 'Payment Received', icon: <FileText className="w-4 h-4" />, description: 'When a payment is recorded' },
  ];

  const actionOptions: { value: WorkflowAction; label: string; icon: React.ReactNode; color: string }[] = [
    { value: 'send_email', label: 'Send Email', icon: <Mail className="w-4 h-4" />, color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
    { value: 'send_sms', label: 'Send SMS', icon: <MessageSquare className="w-4 h-4" />, color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
    { value: 'create_task', label: 'Create Task', icon: <CheckSquare className="w-4 h-4" />, color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    { value: 'update_status', label: 'Update Status', icon: <GitBranch className="w-4 h-4" />, color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    { value: 'add_note', label: 'Add Note', icon: <FileText className="w-4 h-4" />, color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
    { value: 'assign_user', label: 'Assign User', icon: <User className="w-4 h-4" />, color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
    { value: 'create_calendar_event', label: 'Create Event', icon: <Calendar className="w-4 h-4" />, color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  ];

  const getTriggerInfo = (trigger: WorkflowTrigger) => {
    return triggerOptions.find(t => t.value === trigger);
  };

  const getActionInfo = (action: WorkflowAction) => {
    return actionOptions.find(a => a.value === action);
  };

  const toggleWorkflowStatus = (workflowId: string) => {
    setWorkflows(workflows.map(w =>
      w.id === workflowId ? { ...w, is_active: !w.is_active } : w
    ));
  };

  const duplicateWorkflow = (workflow: CRMWorkflow) => {
    const newWf: CRMWorkflow = {
      ...workflow,
      id: Date.now().toString(),
      name: `${workflow.name} (Copy)`,
      is_active: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setWorkflows([...workflows, newWf]);
  };

  const deleteWorkflow = (workflowId: string) => {
    setWorkflows(workflows.filter(w => w.id !== workflowId));
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Workflows</h1>
          <p className="text-slate-400 mt-1">
            Automate your business processes with custom workflows
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl font-medium text-sm transition-all shadow-lg shadow-cyan-500/25"
        >
          <Plus className="w-4 h-4" />
          Create Workflow
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <GitBranch className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{workflows.length}</p>
              <p className="text-sm text-slate-400">Total Workflows</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Play className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{workflows.filter(w => w.is_active).length}</p>
              <p className="text-sm text-slate-400">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">248</p>
              <p className="text-sm text-slate-400">Executions (30d)</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">12h</p>
              <p className="text-sm text-slate-400">Time Saved</p>
            </div>
          </div>
        </div>
      </div>

      {/* Workflows List */}
      <div className="space-y-4">
        {workflows.map((workflow) => (
          <div
            key={workflow.id}
            className={`bg-slate-800/50 backdrop-blur-xl border rounded-2xl overflow-hidden transition-all ${
              workflow.is_active ? 'border-cyan-500/30' : 'border-white/10'
            }`}
          >
            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    workflow.is_active ? 'bg-cyan-500/20' : 'bg-slate-700/50'
                  }`}>
                    <GitBranch className={`w-6 h-6 ${workflow.is_active ? 'text-cyan-400' : 'text-slate-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-semibold">{workflow.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        workflow.is_active
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-slate-500/20 text-slate-300'
                      }`}>
                        {workflow.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm">{workflow.description}</p>

                    {/* Trigger */}
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-xs text-slate-500">When:</span>
                      <span className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 text-purple-300 rounded-lg text-xs">
                        {getTriggerInfo(workflow.trigger)?.icon}
                        {getTriggerInfo(workflow.trigger)?.label}
                      </span>
                    </div>

                    {/* Actions Flow */}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="text-xs text-slate-500">Then:</span>
                      {workflow.actions.map((action, index) => (
                        <React.Fragment key={action.id}>
                          <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs border ${getActionInfo(action.action_type)?.color}`}>
                            {getActionInfo(action.action_type)?.icon}
                            {getActionInfo(action.action_type)?.label}
                            {action.delay_minutes > 0 && (
                              <span className="text-slate-400 ml-1">({action.delay_minutes}m delay)</span>
                            )}
                          </span>
                          {index < workflow.actions.length - 1 && (
                            <ArrowRight className="w-3 h-3 text-slate-500" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleWorkflowStatus(workflow.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      workflow.is_active
                        ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                        : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {workflow.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setSelectedWorkflow(workflow)}
                    className="p-2 rounded-lg bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => duplicateWorkflow(workflow)}
                    className="p-2 rounded-lg bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteWorkflow(workflow.id)}
                    className="p-2 rounded-lg bg-slate-700/50 text-slate-400 hover:bg-rose-500/20 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Footer Stats */}
            <div className="px-5 py-3 bg-slate-900/30 border-t border-white/5 flex items-center justify-between text-xs text-slate-500">
              <span>Created {new Date(workflow.created_at).toLocaleDateString()}</span>
              <span>42 executions this month</span>
            </div>
          </div>
        ))}
      </div>

      {/* Create Workflow Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">Create New Workflow</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Workflow Name</label>
                  <input
                    type="text"
                    value={newWorkflow.name}
                    onChange={(e) => setNewWorkflow({ ...newWorkflow, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                    placeholder="e.g., New Lead Welcome Sequence"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                  <textarea
                    rows={2}
                    value={newWorkflow.description}
                    onChange={(e) => setNewWorkflow({ ...newWorkflow, description: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 resize-none"
                    placeholder="Describe what this workflow does..."
                  />
                </div>
              </div>

              {/* Trigger Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">When this happens (Trigger)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {triggerOptions.map((trigger) => (
                    <button
                      key={trigger.value}
                      onClick={() => setNewWorkflow({ ...newWorkflow, trigger: trigger.value })}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        newWorkflow.trigger === trigger.value
                          ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                          : 'bg-slate-700/30 border-white/10 text-slate-300 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {trigger.icon}
                        <span className="font-medium text-sm">{trigger.label}</span>
                      </div>
                      <p className="text-xs text-slate-400">{trigger.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">Do these actions</label>

                {newWorkflow.actions.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {newWorkflow.actions.map((action, index) => (
                      <div
                        key={index}
                        className={`flex items-center justify-between p-3 rounded-xl border ${getActionInfo(action.action_type)?.color}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs">
                            {index + 1}
                          </span>
                          {getActionInfo(action.action_type)?.icon}
                          <span>{getActionInfo(action.action_type)?.label}</span>
                        </div>
                        <button
                          onClick={() => {
                            const newActions = [...newWorkflow.actions];
                            newActions.splice(index, 1);
                            setNewWorkflow({ ...newWorkflow, actions: newActions });
                          }}
                          className="p-1 hover:bg-white/10 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {actionOptions.map((action) => (
                    <button
                      key={action.value}
                      onClick={() => {
                        const newAction: CRMWorkflowAction = {
                          id: Date.now().toString(),
                          action_type: action.value,
                          action_config: {},
                          delay_minutes: 0,
                          order: newWorkflow.actions.length + 1,
                        };
                        setNewWorkflow({
                          ...newWorkflow,
                          actions: [...newWorkflow.actions, newAction],
                        });
                      }}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-sm transition-all ${action.color} hover:opacity-80`}
                    >
                      {action.icon}
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/10">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={!newWorkflow.name || newWorkflow.actions.length === 0}
                className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Workflow
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workflow Detail Modal */}
      {selectedWorkflow && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  selectedWorkflow.is_active ? 'bg-cyan-500/20' : 'bg-slate-700/50'
                }`}>
                  <GitBranch className={`w-5 h-5 ${selectedWorkflow.is_active ? 'text-cyan-400' : 'text-slate-400'}`} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">{selectedWorkflow.name}</h2>
                  <p className="text-sm text-slate-400">{selectedWorkflow.description}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedWorkflow(null)}
                className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Workflow Visual */}
              <div className="space-y-4">
                {/* Trigger */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="flex-1 p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                    <p className="text-xs text-purple-300 mb-1">TRIGGER</p>
                    <p className="text-white font-medium">{getTriggerInfo(selectedWorkflow.trigger)?.label}</p>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex justify-center">
                  <div className="w-0.5 h-6 bg-slate-600" />
                </div>

                {/* Actions */}
                {selectedWorkflow.actions.map((action, index) => (
                  <React.Fragment key={action.id}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        index === 0 ? 'bg-cyan-500/20' :
                        index === 1 ? 'bg-amber-500/20' :
                        'bg-emerald-500/20'
                      }`}>
                        <span className={`text-sm font-bold ${
                          index === 0 ? 'text-cyan-400' :
                          index === 1 ? 'text-amber-400' :
                          'text-emerald-400'
                        }`}>{index + 1}</span>
                      </div>
                      <div className={`flex-1 p-4 rounded-xl border ${getActionInfo(action.action_type)?.color}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs opacity-70 mb-1">ACTION {index + 1}</p>
                            <div className="flex items-center gap-2">
                              {getActionInfo(action.action_type)?.icon}
                              <p className="font-medium">{getActionInfo(action.action_type)?.label}</p>
                            </div>
                          </div>
                          {action.delay_minutes > 0 && (
                            <span className="flex items-center gap-1 px-2 py-1 bg-slate-800/50 rounded text-xs">
                              <Clock className="w-3 h-3" />
                              {action.delay_minutes}m delay
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {index < selectedWorkflow.actions.length - 1 && (
                      <div className="flex justify-center">
                        <div className="w-0.5 h-6 bg-slate-600" />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">42</p>
                  <p className="text-xs text-slate-400">Executions (30d)</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">98%</p>
                  <p className="text-xs text-slate-400">Success Rate</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">2.1s</p>
                  <p className="text-xs text-slate-400">Avg. Time</p>
                </div>
              </div>
            </div>

            <div className="flex justify-between gap-3 px-6 py-4 border-t border-white/10">
              <button
                onClick={() => {
                  toggleWorkflowStatus(selectedWorkflow.id);
                  setSelectedWorkflow({ ...selectedWorkflow, is_active: !selectedWorkflow.is_active });
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                  selectedWorkflow.is_active
                    ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                }`}
              >
                {selectedWorkflow.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {selectedWorkflow.is_active ? 'Pause' : 'Activate'}
              </button>
              <div className="flex gap-3">
                <button className="px-4 py-2 bg-slate-700/50 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors">
                  Edit
                </button>
                <button
                  onClick={() => setSelectedWorkflow(null)}
                  className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRMWorkflows;
