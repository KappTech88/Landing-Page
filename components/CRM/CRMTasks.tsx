import React, { useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  CheckSquare,
  Square,
  Clock,
  Calendar,
  User,
  Tag,
  MoreVertical,
  X,
  AlertCircle,
  ChevronDown,
  SortAsc,
  SortDesc,
  Briefcase,
  Flag,
} from 'lucide-react';
import { CRMTask, TaskPriorityLevel, TaskStatus } from '../../types';

const CRMTasks: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<TaskPriorityLevel | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<CRMTask | null>(null);
  const [sortBy, setSortBy] = useState<'due_date' | 'priority' | 'created'>('due_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [tasks, setTasks] = useState<CRMTask[]>([
    {
      id: '1',
      organization_id: 'org-1',
      job_id: 'job-1',
      created_by: 'user-1',
      assigned_to: 'user-1',
      title: 'Follow up call with State Farm adjuster',
      description: 'Discuss claim #SF-2024-4521 for Johnson property',
      priority: 'high',
      status: 'pending',
      due_date: new Date(Date.now() + 3600000).toISOString().split('T')[0],
      due_time: '14:00',
      tags: ['Insurance', 'Urgent'],
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '2',
      organization_id: 'org-1',
      job_id: 'job-2',
      created_by: 'user-1',
      title: 'Submit supplement for Johnson claim',
      description: 'Include additional roof damage documentation',
      priority: 'urgent',
      status: 'in_progress',
      due_date: new Date(Date.now() + 7200000).toISOString().split('T')[0],
      due_time: '17:00',
      tags: ['Supplement', 'Deadline'],
      created_at: new Date(Date.now() - 172800000).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '3',
      organization_id: 'org-1',
      contact_id: 'contact-2',
      created_by: 'user-1',
      title: 'Schedule inspection for Williams property',
      description: 'Initial storm damage assessment',
      priority: 'medium',
      status: 'pending',
      due_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      tags: ['Inspection'],
      created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '4',
      organization_id: 'org-1',
      job_id: 'job-3',
      created_by: 'user-1',
      title: 'Review estimate for Davis residence',
      description: 'Final review before sending to client',
      priority: 'low',
      status: 'pending',
      due_date: new Date(Date.now() + 172800000).toISOString().split('T')[0],
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '5',
      organization_id: 'org-1',
      created_by: 'user-1',
      title: 'Order roofing materials from ABC Supplies',
      description: '50 squares of CertainTeed shingles',
      priority: 'medium',
      status: 'completed',
      due_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      completed_at: new Date(Date.now() - 43200000).toISOString(),
      tags: ['Materials'],
      created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '6',
      organization_id: 'org-1',
      contact_id: 'contact-1',
      created_by: 'user-1',
      title: 'Send project completion photos to insurance',
      description: 'Upload final walkthrough photos to claim portal',
      priority: 'high',
      status: 'pending',
      due_date: new Date(Date.now() - 3600000).toISOString().split('T')[0],
      due_time: '12:00',
      tags: ['Photos', 'Overdue'],
      created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]);

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium' as TaskPriorityLevel,
    due_date: '',
    due_time: '',
    tags: '',
  });

  const getPriorityColor = (priority: TaskPriorityLevel) => {
    const colors: Record<TaskPriorityLevel, string> = {
      low: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
      medium: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      high: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      urgent: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    };
    return colors[priority];
  };

  const getPriorityDot = (priority: TaskPriorityLevel) => {
    const colors: Record<TaskPriorityLevel, string> = {
      low: 'bg-slate-500',
      medium: 'bg-blue-500',
      high: 'bg-amber-500',
      urgent: 'bg-rose-500',
    };
    return colors[priority];
  };

  const getStatusColor = (status: TaskStatus) => {
    const colors: Record<TaskStatus, string> = {
      pending: 'bg-slate-500/20 text-slate-300',
      in_progress: 'bg-cyan-500/20 text-cyan-300',
      completed: 'bg-emerald-500/20 text-emerald-300',
      cancelled: 'bg-rose-500/20 text-rose-300',
    };
    return colors[status];
  };

  const isOverdue = (task: CRMTask) => {
    if (task.status === 'completed' || task.status === 'cancelled') return false;
    const dueDate = new Date(task.due_date + (task.due_time ? `T${task.due_time}` : 'T23:59:59'));
    return dueDate < new Date();
  };

  const toggleTaskStatus = (taskId: string) => {
    setTasks(tasks.map(task => {
      if (task.id === taskId) {
        const newStatus = task.status === 'completed' ? 'pending' : 'completed';
        return {
          ...task,
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : undefined,
        };
      }
      return task;
    }));
  };

  const filteredTasks = tasks
    .filter((task) => {
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
      const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
      return matchesSearch && matchesStatus && matchesPriority;
    })
    .sort((a, b) => {
      if (sortBy === 'due_date') {
        const dateA = new Date(a.due_date + (a.due_time ? `T${a.due_time}` : '')).getTime();
        const dateB = new Date(b.due_date + (b.due_time ? `T${b.due_time}` : '')).getTime();
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      }
      if (sortBy === 'priority') {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        const diff = priorityOrder[a.priority] - priorityOrder[b.priority];
        return sortOrder === 'asc' ? diff : -diff;
      }
      if (sortBy === 'created') {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      }
      return 0;
    });

  const pendingTasks = filteredTasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled');
  const completedTasks = filteredTasks.filter(t => t.status === 'completed');
  const overdueTasks = pendingTasks.filter(t => isOverdue(t));

  const formatDueDate = (date: string, time?: string) => {
    const dueDate = new Date(date + (time ? `T${time}` : ''));
    const now = new Date();
    const diffMs = dueDate.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? 's' : ''} overdue`;
    }
    if (diffDays === 0) {
      if (time) {
        return `Today at ${new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
      }
      return 'Today';
    }
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `In ${diffDays} days`;
    return dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Tasks</h1>
          <p className="text-slate-400 mt-1">
            {pendingTasks.length} pending, {overdueTasks.length} overdue
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl font-medium text-sm transition-all shadow-lg shadow-cyan-500/25"
        >
          <Plus className="w-4 h-4" />
          Add Task
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{pendingTasks.length}</p>
              <p className="text-sm text-slate-400">Pending</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-500/20 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{overdueTasks.length}</p>
              <p className="text-sm text-slate-400">Overdue</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <CheckSquare className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{tasks.filter(t => t.priority === 'urgent' || t.priority === 'high').length}</p>
              <p className="text-sm text-slate-400">High Priority</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <CheckSquare className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{completedTasks.length}</p>
              <p className="text-sm text-slate-400">Completed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as TaskStatus | 'all')}
              className="appearance-none pl-4 pr-10 py-2.5 bg-slate-800/50 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500/50 cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as TaskPriorityLevel | 'all')}
              className="appearance-none pl-4 pr-10 py-2.5 bg-slate-800/50 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500/50 cursor-pointer"
            >
              <option value="all">All Priority</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-2.5 bg-slate-800/50 border border-white/10 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            {sortOrder === 'asc' ? <SortAsc className="w-5 h-5" /> : <SortDesc className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-6">
        {/* Pending Tasks */}
        {pendingTasks.length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-white/10 bg-slate-800/50">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Pending ({pendingTasks.length})
              </h2>
            </div>
            <div className="divide-y divide-white/5">
              {pendingTasks.map((task) => (
                <div
                  key={task.id}
                  className={`px-5 py-4 hover:bg-white/5 transition-colors cursor-pointer ${
                    isOverdue(task) ? 'bg-rose-500/5' : ''
                  }`}
                  onClick={() => setSelectedTask(task)}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTaskStatus(task.id);
                      }}
                      className="mt-0.5 text-slate-400 hover:text-cyan-400 transition-colors"
                    >
                      <Square className="w-5 h-5" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2 h-2 rounded-full ${getPriorityDot(task.priority)}`} />
                        <h3 className="text-white font-medium truncate">{task.title}</h3>
                        {isOverdue(task) && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-rose-500/20 text-rose-300 rounded text-xs">
                            <AlertCircle className="w-3 h-3" />
                            Overdue
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-slate-400 text-sm truncate mb-2">{task.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className={`px-2 py-0.5 rounded capitalize ${getStatusColor(task.status)}`}>
                          {task.status.replace('_', ' ')}
                        </span>
                        <span className={`px-2 py-0.5 rounded border capitalize ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                        <span className={`flex items-center gap-1 ${isOverdue(task) ? 'text-rose-400' : ''}`}>
                          <Calendar className="w-3 h-3" />
                          {formatDueDate(task.due_date, task.due_time)}
                        </span>
                        {task.job_id && (
                          <span className="flex items-center gap-1">
                            <Briefcase className="w-3 h-3" />
                            Job linked
                          </span>
                        )}
                      </div>
                      {task.tags && task.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {task.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="px-2 py-0.5 bg-slate-700/50 text-slate-300 rounded text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed Tasks */}
        {completedTasks.length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-white/10 bg-slate-800/50">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-400" />
                Completed ({completedTasks.length})
              </h2>
            </div>
            <div className="divide-y divide-white/5">
              {completedTasks.map((task) => (
                <div
                  key={task.id}
                  className="px-5 py-4 hover:bg-white/5 transition-colors cursor-pointer opacity-60"
                  onClick={() => setSelectedTask(task)}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTaskStatus(task.id);
                      }}
                      className="mt-0.5 text-emerald-400 hover:text-cyan-400 transition-colors"
                    >
                      <CheckSquare className="w-5 h-5" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-slate-300 font-medium truncate line-through">{task.title}</h3>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1">
                          <CheckSquare className="w-3 h-3" />
                          Completed
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {filteredTasks.length === 0 && (
          <div className="text-center py-12">
            <CheckSquare className="w-12 h-12 mx-auto text-slate-600 mb-3" />
            <p className="text-slate-400">No tasks found</p>
            <p className="text-slate-500 text-sm mt-1">Try adjusting your filters or add a new task</p>
          </div>
        )}
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">Create Task</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Task Title</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                  placeholder="e.g., Follow up with client"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                <textarea
                  rows={3}
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 resize-none"
                  placeholder="Add task details..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as TaskPriorityLevel })}
                    className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Due Date</label>
                  <input
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Due Time (Optional)</label>
                <input
                  type="time"
                  value={newTask.due_time}
                  onChange={(e) => setNewTask({ ...newTask, due_time: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Tags (comma separated)</label>
                <input
                  type="text"
                  value={newTask.tags}
                  onChange={(e) => setNewTask({ ...newTask, tags: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                  placeholder="e.g., Insurance, Urgent"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/10">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl font-medium transition-all">
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-white/10 rounded-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">Task Details</h2>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <button
                  onClick={() => {
                    toggleTaskStatus(selectedTask.id);
                    setSelectedTask({
                      ...selectedTask,
                      status: selectedTask.status === 'completed' ? 'pending' : 'completed',
                    });
                  }}
                  className={`mt-0.5 ${
                    selectedTask.status === 'completed' ? 'text-emerald-400' : 'text-slate-400 hover:text-cyan-400'
                  } transition-colors`}
                >
                  {selectedTask.status === 'completed' ? (
                    <CheckSquare className="w-6 h-6" />
                  ) : (
                    <Square className="w-6 h-6" />
                  )}
                </button>
                <div>
                  <h3 className={`text-xl font-semibold ${selectedTask.status === 'completed' ? 'text-slate-400 line-through' : 'text-white'}`}>
                    {selectedTask.title}
                  </h3>
                  {selectedTask.description && (
                    <p className="text-slate-400 mt-2">{selectedTask.description}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <span className={`px-3 py-1.5 rounded-lg border capitalize ${getPriorityColor(selectedTask.priority)}`}>
                  <Flag className="w-3 h-3 inline mr-1" />
                  {selectedTask.priority} Priority
                </span>
                <span className={`px-3 py-1.5 rounded-lg capitalize ${getStatusColor(selectedTask.status)}`}>
                  {selectedTask.status.replace('_', ' ')}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-xl">
                  <Calendar className={`w-5 h-5 ${isOverdue(selectedTask) ? 'text-rose-400' : 'text-slate-400'}`} />
                  <div>
                    <p className="text-xs text-slate-400">Due Date</p>
                    <p className={`text-white ${isOverdue(selectedTask) ? 'text-rose-300' : ''}`}>
                      {formatDueDate(selectedTask.due_date, selectedTask.due_time)}
                    </p>
                  </div>
                </div>
              </div>

              {selectedTask.tags && selectedTask.tags.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-slate-300 mb-2">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedTask.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-slate-700/50 text-slate-300 rounded-lg text-sm flex items-center gap-1"
                      >
                        <Tag className="w-3 h-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-white/10">
                <button className="flex-1 px-4 py-2 bg-slate-700/50 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors">
                  Edit
                </button>
                <button className="flex-1 px-4 py-2 bg-rose-500/20 text-rose-300 rounded-xl hover:bg-rose-500/30 transition-colors">
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRMTasks;
