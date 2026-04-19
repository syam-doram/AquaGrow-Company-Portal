import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot, orderBy, addDoc, doc, updateDoc, Timestamp, where } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import {
  Ticket, Plus, Search, X, Send, MessageCircle, AlertCircle,
  Clock, CheckCircle, ArrowRight, Filter, User,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';

type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
type TicketCategory = 'hr' | 'salary' | 'technical' | 'field' | 'other';

interface TicketRecord {
  id: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  createdBy: string;
  createdByName: string;
  assignedTo?: string;
  assignedToName?: string;
  comments: Array<{ text: string; by: string; byName: string; at: Timestamp }>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

const CATEGORY_CONFIG: Record<TicketCategory, { label: string; color: string; bg: string }> = {
  hr:        { label: 'HR Issue',     color: 'oklch(0.75 0.16 240)', bg: 'oklch(0.65 0.18 240 / 0.1)' },
  salary:    { label: 'Salary',       color: 'oklch(0.72 0.19 167)', bg: 'oklch(0.72 0.19 167 / 0.1)' },
  technical: { label: 'Technical',    color: 'oklch(0.78 0.17 295)', bg: 'oklch(0.65 0.2 295 / 0.1)' },
  field:     { label: 'Field Issue',  color: 'oklch(0.78 0.17 70)',  bg: 'oklch(0.78 0.17 70 / 0.1)' },
  other:     { label: 'Other',        color: 'oklch(0.55 0.02 210)', bg: 'oklch(1 0 0 / 0.05)' },
};

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; badge: string }> = {
  low:      { label: 'Low',      badge: 'aq-badge-blue' },
  medium:   { label: 'Medium',   badge: 'aq-badge-amber' },
  high:     { label: 'High',     badge: 'aq-badge-red' },
  critical: { label: 'Critical', badge: 'aq-badge-red' },
};

const STATUS_CONFIG: Record<TicketStatus, { label: string; badge: string; icon: React.ComponentType<any> }> = {
  open:        { label: 'Open',        badge: 'aq-badge-amber', icon: AlertCircle },
  in_progress: { label: 'In Progress', badge: 'aq-badge-blue',  icon: Clock },
  resolved:    { label: 'Resolved',    badge: 'aq-badge-green', icon: CheckCircle },
  closed:      { label: 'Closed',      badge: 'aq-badge-blue',  icon: CheckCircle },
};

const TicketSystem: React.FC<{ admin?: boolean }> = ({ admin = false }) => {
  const { employee, hasPermission } = useAuth();
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [selected, setSelected] = useState<TicketRecord | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [comment, setComment] = useState('');
  const [form, setForm] = useState({ title: '', description: '', category: 'hr' as TicketCategory, priority: 'medium' as TicketPriority });
  const [saving, setSaving] = useState(false);
  const canManage = hasPermission('manage_tickets');

  useEffect(() => {
    if (!employee) return;
    const q = (admin && canManage)
      ? query(collection(db, 'tickets'), orderBy('createdAt', 'desc'))
      : query(collection(db, 'tickets'), where('createdBy', '==', employee.uid), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as TicketRecord));
      setTickets(docs);
      if (selected) setSelected(docs.find(d => d.id === selected.id) ?? null);
    });
    return () => unsub();
  }, [employee, admin, canManage]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'tickets'), {
        ...form,
        status: 'open',
        createdBy: employee.uid,
        createdByName: employee.name,
        comments: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      toast.success('Ticket raised! Our team will respond shortly.');
      setShowCreate(false);
      setForm({ title: '', description: '', category: 'hr', priority: 'medium' });
    } catch {
      toast.error('Failed to create ticket');
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (ticketId: string, newStatus: TicketStatus) => {
    await updateDoc(doc(db, 'tickets', ticketId), { status: newStatus, updatedAt: Timestamp.now() });
    toast.success(`Ticket ${newStatus.replace('_', ' ')}`);
  };

  const addComment = async () => {
    if (!comment.trim() || !selected || !employee) return;
    const updatedComments = [
      ...(selected.comments ?? []),
      { text: comment, by: employee.uid, byName: employee.name, at: Timestamp.now() },
    ];
    await updateDoc(doc(db, 'tickets', selected.id), { comments: updatedComments, updatedAt: Timestamp.now() });
    setComment('');
    toast.success('Comment added');
  };

  const filtered = tickets.filter(t => {
    const s = search.toLowerCase();
    const matchSearch = !s || t.title.toLowerCase().includes(s) || t.category.includes(s);
    const matchStatus = filterStatus === 'all' || t.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {admin ? 'Ticket Management' : 'Support Tickets'}
          </h1>
          <p className="text-xs text-[oklch(0.5_0.02_210)] mt-0.5">
            {filtered.length} ticket{filtered.length !== 1 ? 's' : ''}
            {admin && ` · ${tickets.filter(t => t.status === 'open').length} open`}
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="aq-btn-primary !text-xs !py-2 shrink-0">
          <Plus size={14} /> {admin ? 'Create Ticket' : 'Raise Ticket'}
        </button>
      </div>

      {/* Quick Stats (admin) */}
      {admin && (
        <div className="grid grid-cols-4 gap-3">
          {(['open','in_progress','resolved','closed'] as TicketStatus[]).map(s => {
            const cfg = STATUS_CONFIG[s];
            const count = tickets.filter(t => t.status === s).length;
            return (
              <button key={s} onClick={() => setFilterStatus(filterStatus === s ? 'all' : s)}
                className={`aq-stat-card text-left transition-all ${filterStatus === s ? 'border-[oklch(0.72_0.19_167/0.3)]' : ''}`}>
                <p className="text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-1">{cfg.label}</p>
                <p className="text-xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{count}</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[oklch(0.45_0.02_210)]" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search tickets…" className="aq-input pl-8 !py-1.5 !text-xs" />
        </div>
        <div className="flex gap-1.5">
          {['all', 'open', 'in_progress', 'resolved', 'closed'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className="px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all capitalize"
              style={filterStatus === s ? { background: 'oklch(0.72 0.19 167 / 0.15)', color: 'oklch(0.72 0.19 167)', border: '1px solid oklch(0.72 0.19 167 / 0.3)' } : { background: 'oklch(1 0 0 / 4%)', color: 'oklch(0.55 0.02 210)', border: '1px solid oklch(1 0 0 / 8%)' }}>
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Ticket List */}
        <div className="space-y-2">
          {filtered.map((ticket) => {
            const cat = CATEGORY_CONFIG[ticket.category];
            const sc  = STATUS_CONFIG[ticket.status];
            const pri = PRIORITY_CONFIG[ticket.priority];
            const StatusIcon = sc.icon;
            return (
              <motion.button key={ticket.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                onClick={() => setSelected(ticket)}
                className={`w-full text-left glass-panel p-4 transition-all hover:border-[oklch(0.72_0.19_167/0.3)] ${selected?.id === ticket.id ? 'border-[oklch(0.72_0.19_167/0.3)] bg-[oklch(0.72_0.19_167/0.05)]' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl shrink-0" style={{ background: cat.bg }}>
                    <Ticket size={13} style={{ color: cat.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="text-xs font-bold text-white truncate">{ticket.title}</p>
                    </div>
                    <p className="text-[10px] text-[oklch(0.55_0.02_210)] line-clamp-1 mb-2">{ticket.description}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`aq-badge ${sc.badge}`}>{sc.label}</span>
                      <span className={`aq-badge ${pri.badge}`}>{pri.label}</span>
                      <span className="text-[9px] text-[oklch(0.45_0.02_210)]" style={{ background: cat.bg, color: cat.color, padding: '1px 6px', borderRadius: '9999px', fontSize: '9px', fontWeight: '700' }}>
                        {cat.label}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[9px] text-[oklch(0.45_0.02_210)]">
                      {ticket.createdAt ? formatDistanceToNow(ticket.createdAt.toDate(), { addSuffix: true }) : ''}
                    </p>
                    <p className="text-[9px] text-[oklch(0.4_0.02_210)] mt-0.5">{ticket.comments?.length ?? 0} replies</p>
                  </div>
                </div>
              </motion.button>
            );
          })}
          {filtered.length === 0 && (
            <div className="glass-panel py-12 flex flex-col items-center text-center">
              <Ticket size={32} className="mb-2 text-[oklch(0.3_0.02_210)]" />
              <p className="text-xs text-[oklch(0.45_0.02_210)]">No tickets found</p>
            </div>
          )}
        </div>

        {/* Ticket Detail */}
        {selected ? (
          <div className="glass-panel p-5 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`aq-badge ${STATUS_CONFIG[selected.status].badge}`}>{STATUS_CONFIG[selected.status].label}</span>
                  <span className={`aq-badge ${PRIORITY_CONFIG[selected.priority].badge}`}>{selected.priority}</span>
                </div>
                <h3 className="text-sm font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{selected.title}</h3>
                <p className="text-[10px] text-[oklch(0.5_0.02_210)] mt-0.5">
                  By {selected.createdByName} · {selected.createdAt ? format(selected.createdAt.toDate(), 'MMM dd, yyyy hh:mm a') : ''}
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-xl hover:bg-white/5 text-[oklch(0.5_0.02_210)] shrink-0">
                <X size={14} />
              </button>
            </div>
            <p className="text-xs text-[oklch(0.7_0_0)] leading-relaxed">{selected.description}</p>

            {/* Status Actions (admin) */}
            {canManage && (
              <div className="flex gap-2">
                {selected.status === 'open' && (
                  <button onClick={() => updateStatus(selected.id, 'in_progress')} className="aq-btn-primary !text-xs !py-1.5 flex-1 justify-center">
                    <ArrowRight size={12} /> Start Working
                  </button>
                )}
                {selected.status === 'in_progress' && (
                  <button onClick={() => updateStatus(selected.id, 'resolved')} className="aq-btn-primary !text-xs !py-1.5 flex-1 justify-center">
                    <CheckCircle size={12} /> Mark Resolved
                  </button>
                )}
                {selected.status === 'resolved' && (
                  <button onClick={() => updateStatus(selected.id, 'closed')} className="aq-btn-ghost !text-xs !py-1.5 flex-1 justify-center">
                    Close Ticket
                  </button>
                )}
              </div>
            )}

            {/* Comments */}
            <div style={{ borderTop: '1px solid oklch(1 0 0 / 6%)', paddingTop: '1rem' }}>
              <p className="text-[10px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-3">
                Comments ({selected.comments?.length ?? 0})
              </p>
              <div className="space-y-3 mb-3 max-h-48 overflow-y-auto">
                {(selected.comments ?? []).map((c, i) => (
                  <div key={i} className="flex gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[oklch(0.72_0.19_167)] to-[oklch(0.6_0.16_187)] flex items-center justify-center text-[9px] font-bold text-[oklch(0.08_0.015_200)] shrink-0">
                      {c.byName?.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-white">{c.byName}</p>
                      <p className="text-xs text-[oklch(0.7_0_0)] mt-0.5">{c.text}</p>
                    </div>
                  </div>
                ))}
                {!(selected.comments?.length) && (
                  <p className="text-[10px] text-[oklch(0.4_0.02_210)] text-center py-3">No comments yet</p>
                )}
              </div>
              {/* Comment Input */}
              <div className="flex gap-2">
                <input value={comment} onChange={e => setComment(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addComment()}
                  placeholder="Write a comment…" className="aq-input flex-1 !text-xs !py-1.5" />
                <button onClick={addComment} className="aq-btn-primary !py-1.5 !px-3">
                  <Send size={13} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-panel flex items-center justify-center py-20">
            <div className="text-center">
              <MessageCircle size={32} className="mx-auto mb-2 text-[oklch(0.3_0.02_210)]" />
              <p className="text-xs text-[oklch(0.45_0.02_210)]">Select a ticket to view details</p>
            </div>
          </div>
        )}
      </div>

      {/* Create Ticket Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setShowCreate(false)}>
            <motion.div initial={{ scale: 0.92 }} animate={{ scale: 1 }} exit={{ scale: 0.92 }}
              className="w-full max-w-md glass-panel p-6"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-base font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Raise a Ticket</h3>
                  <p className="text-[10px] text-[oklch(0.5_0.02_210)]">Describe your issue clearly</p>
                </div>
                <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-xl hover:bg-white/5 text-[oklch(0.5_0.02_210)]">
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-1.5">Title</label>
                  <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Brief summary of the issue" className="aq-input text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-1.5">Category</label>
                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as TicketCategory }))} className="aq-input text-sm">
                      {Object.entries(CATEGORY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-1.5">Priority</label>
                    <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as TicketPriority }))} className="aq-input text-sm">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-1.5">Description</label>
                  <textarea required rows={4} value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Explain the issue in detail…" className="aq-input resize-none text-sm" />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowCreate(false)} className="aq-btn-ghost flex-1 justify-center !text-sm">Cancel</button>
                  <button type="submit" disabled={saving} className="aq-btn-primary flex-1 justify-center !text-sm">
                    <Send size={14} /> {saving ? 'Submitting…' : 'Submit Ticket'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TicketSystem;
