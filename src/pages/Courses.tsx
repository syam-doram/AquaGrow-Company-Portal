import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { Play, BookOpen, Clock, Search, Award, Star, Users, ChevronRight, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface Course {
  id: string;
  title: string;
  description: string;
  videoUrl?: string;
  category: string;
  duration?: string;
  level?: string;
  rating?: number;
  enrolled?: number;
}

// ── Static course catalogue (replace with API call when /courses endpoint is ready) ──
const STATIC_COURSES: Course[] = [
  { id: 'c1',  title: 'Shrimp Disease Identification & Management',    description: 'Master identifying common shrimp diseases and implement effective treatment protocols used by top aquaculture farms across Andhra Pradesh.', category: 'Aquaculture', duration: '6h 30m', level: 'Advanced',      rating: 4.8, enrolled: 2500 },
  { id: 'c2',  title: 'Water Quality Monitoring Fundamentals',         description: 'Learn the critical water parameters — DO, pH, ammonia, salinity — and how to control them for optimal shrimp growth.',               category: 'Aquaculture', duration: '3h 15m', level: 'Beginner',      rating: 4.6, enrolled: 1800 },
  { id: 'c3',  title: 'AquaGrow App & IoT Device Training',            description: 'Full walkthrough of the AquaGrow mobile app, pond logging, alert configuration, and IoT sensor management.',                           category: 'IoT',         duration: '2h 00m', level: 'Intermediate',  rating: 4.7, enrolled: 1200 },
  { id: 'c4',  title: 'Sales Techniques for Aquaculture Products',     description: 'Practical sales frameworks for field executives — pitch scripting, objection handling, and closing deals with farmers.',                category: 'Sales',       duration: '4h 00m', level: 'Intermediate',  rating: 4.5, enrolled: 980  },
  { id: 'c5',  title: 'Feed Management & FCR Optimisation',            description: 'Understand feed conversion ratios, feeding schedules, and best practices to maximise biomass while minimising cost.',                   category: 'Aquaculture', duration: '2h 45m', level: 'Intermediate',  rating: 4.4, enrolled: 1500 },
  { id: 'c6',  title: 'Warehouse & Inventory Best Practices',          description: 'Standard procedures for stock management, FIFO rotation, expiry tracking, and cold-chain handling for aquaculture inputs.',             category: 'Operations',  duration: '1h 30m', level: 'Beginner',      rating: 4.3, enrolled: 640  },
  { id: 'c7',  title: 'Order Processing & Customer Communication',     description: 'Step-by-step guide for order executives — from confirmation to dispatch coordination and proactive farmer updates.',                    category: 'Operations',  duration: '1h 45m', level: 'Beginner',      rating: 4.5, enrolled: 720  },
  { id: 'c8',  title: 'Shrimp Health & Biosecurity Protocols',         description: 'Critical biosecurity measures to prevent disease outbreaks — pond preparation, seed selection, and health monitoring cycles.',          category: 'Health',      duration: '5h 00m', level: 'Advanced',      rating: 4.9, enrolled: 3100 },
  { id: 'c9',  title: 'Last-Mile Delivery & Route Planning',           description: 'Efficient route planning, delivery documentation, and handling failed deliveries in rural AP & Telangana zones.',                       category: 'Operations',  duration: '1h 15m', level: 'Beginner',      rating: 4.2, enrolled: 480  },
  { id: 'c10', title: 'CRM & Customer Retention Strategies',           description: 'Build long-term farmer relationships through follow-up, WhatsApp engagement, and personalised support using CRM tools.',               category: 'Sales',       duration: '2h 30m', level: 'Intermediate',  rating: 4.6, enrolled: 860  },
  { id: 'c11', title: 'Aerator Maintenance & Troubleshooting',         description: 'Hands-on guide for field technicians — routine servicing, impeller replacement, and diagnosing common aerator failures.',              category: 'IoT',         duration: '3h 00m', level: 'Intermediate',  rating: 4.7, enrolled: 920  },
  { id: 'c12', title: 'Financial Basics for Aquaculture Operations',   description: 'Cost accounting, ROI calculation, and profitability analysis tailored to shrimp farming cycles.',                                      category: 'Operations',  duration: '2h 15m', level: 'Intermediate',  rating: 4.4, enrolled: 560  },
];

const CATEGORY_COLORS: Record<string, string> = {
  'Aquaculture':  'oklch(0.72 0.19 167)',
  'Sales':        'oklch(0.75 0.16 240)',
  'IoT':          'oklch(0.78 0.17 295)',
  'Operations':   'oklch(0.78 0.17 70)',
  'Health':       'oklch(0.75 0.18 25)',
  'default':      'oklch(0.65 0.18 240)',
};

const FEATURED = STATIC_COURSES[0];

const Courses: React.FC = () => {
  const { employee } = useAuth();
  const [courses] = useState<Course[]>(STATIC_COURSES);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  const categories = ['All', ...Array.from(new Set(courses.map(c => c.category).filter(Boolean)))];

  const filtered = courses.filter(c => {
    const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.category?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = activeFilter === 'All' || c.category === activeFilter;
    return matchSearch && matchFilter;
  });

  const handleEnroll = (title: string) => {
    toast.success(`Enrolled in "${title}"! Check your email for details.`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Learning Center</h1>
          <p className="text-sm text-[oklch(0.5_0.02_210)] mt-0.5">Enhance your skills with AquaGrow training programs.</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[oklch(0.45_0.02_210)]" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search courses…"
            className="aq-input pl-9 w-full sm:w-[260px]" />
        </div>
      </div>

      {/* Featured Course Banner */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="glass-panel overflow-hidden relative"
        style={{ background: 'linear-gradient(135deg, oklch(0.72 0.19 167 / 0.15), oklch(0.6 0.16 187 / 0.08))', border: '1px solid oklch(0.72 0.19 167 / 0.2)' }}>
        {/* BG pattern */}
        <div className="absolute inset-0 opacity-5 pointer-events-none"
          style={{ backgroundImage: 'linear-gradient(oklch(1 0 0) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

        <div className="p-6 relative z-10">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="aq-badge" style={{ background: 'oklch(0.72 0.19 167 / 0.2)', color: 'oklch(0.72 0.19 167)', border: '1px solid oklch(0.72 0.19 167 / 0.3)' }}>
                  <Star size={8} /> Featured
                </span>
                <span className="aq-badge aq-badge-blue">{FEATURED.level}</span>
              </div>
              <h2 className="text-lg font-bold text-white mb-1.5" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{FEATURED.title}</h2>
              <p className="text-sm text-[oklch(0.6_0.02_210)] mb-4 max-w-xl">{FEATURED.description}</p>
              <div className="flex items-center gap-5 mb-4">
                <div className="flex items-center gap-1.5">
                  <Star size={13} className="text-[oklch(0.78_0.17_70)] fill-[oklch(0.78_0.17_70)]" />
                  <span className="text-sm font-bold text-white">{FEATURED.rating}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users size={13} className="text-[oklch(0.5_0.02_210)]" />
                  <span className="text-sm text-[oklch(0.65_0_0)]">{(FEATURED.enrolled ?? 0).toLocaleString()} enrolled</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={13} className="text-[oklch(0.5_0.02_210)]" />
                  <span className="text-sm text-[oklch(0.65_0_0)]">{FEATURED.duration}</span>
                </div>
              </div>
              <button onClick={() => handleEnroll(FEATURED.title)} className="aq-btn-primary">
                <Zap size={14} /> Enroll Now
                <ChevronRight size={14} className="opacity-60" />
              </button>
            </div>
            {/* Icon decoration */}
            <div className="hidden sm:flex w-20 h-20 rounded-2xl items-center justify-center shrink-0 animate-float"
              style={{ background: 'oklch(0.72 0.19 167 / 0.12)', border: '1px solid oklch(0.72 0.19 167 / 0.2)' }}>
              <Award size={36} className="text-[oklch(0.72_0.19_167)]" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Category Filters */}
      {categories.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveFilter(cat)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
              style={activeFilter === cat ? {
                background: 'oklch(0.72 0.19 167 / 0.15)',
                color: 'oklch(0.72 0.19 167)',
                border: '1px solid oklch(0.72 0.19 167 / 0.3)',
              } : {
                background: 'oklch(1 0 0 / 4%)',
                color: 'oklch(0.55 0.02 210)',
                border: '1px solid oklch(1 0 0 / 8%)',
              }}>
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Course Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((course, i) => {
          const catColor = CATEGORY_COLORS[course.category] ?? CATEGORY_COLORS.default;
          return (
            <motion.div key={course.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.06, 0.4) }}
              className="glass-panel overflow-hidden hover:border-[oklch(0.72_0.19_167/0.25)] transition-all group flex flex-col"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video overflow-hidden" style={{ background: 'oklch(1 0 0 / 5%)' }}>
                <img
                  src={`https://picsum.photos/seed/${course.id}/600/400`}
                  alt={course.title}
                  className="w-full h-full object-cover opacity-70 group-hover:opacity-90 group-hover:scale-105 transition-all duration-500"
                  referrerPolicy="no-referrer"
                />
                {/* Play Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: 'oklch(0 0 0 / 0.4)' }}>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md"
                    style={{ background: 'oklch(0.72 0.19 167 / 0.9)' }}>
                    <Play size={20} className="text-[oklch(0.08_0.015_200)] ml-0.5" />
                  </div>
                </div>
                {/* Category Badge */}
                <div className="absolute top-2 left-2">
                  <span className="aq-badge text-[9px]"
                    style={{ background: catColor, color: 'oklch(0.08 0.015 200)', border: 'none' }}>
                    {course.category}
                  </span>
                </div>
                {course.level && (
                  <div className="absolute top-2 right-2">
                    <span className="aq-badge aq-badge-blue text-[9px]">{course.level}</span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4 flex flex-col flex-1">
                <h3 className="text-sm font-bold text-white mb-1 group-hover:text-[oklch(0.9_0_0)] transition-colors leading-snug">
                  {course.title}
                </h3>
                <p className="text-xs text-[oklch(0.55_0.02_210)] line-clamp-2 flex-1 mb-3">{course.description}</p>

                <div className="flex items-center gap-3 mb-3">
                  {course.rating && (
                    <div className="flex items-center gap-1">
                      <Star size={11} className="text-[oklch(0.78_0.17_70)] fill-[oklch(0.78_0.17_70)]" />
                      <span className="text-[10px] font-bold text-white">{course.rating}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Clock size={11} className="text-[oklch(0.45_0.02_210)]" />
                    <span className="text-[10px] text-[oklch(0.55_0.02_210)]">{course.duration ?? '45m'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <BookOpen size={11} className="text-[oklch(0.45_0.02_210)]" />
                    <span className="text-[10px] text-[oklch(0.55_0.02_210)]">12 lessons</span>
                  </div>
                </div>

                <button onClick={() => handleEnroll(course.title)}
                  className="w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  style={{
                    background: 'oklch(0.72 0.19 167 / 0.1)',
                    color: 'oklch(0.72 0.19 167)',
                    border: '1px solid oklch(0.72 0.19 167 / 0.2)',
                  }}
                  onMouseEnter={e => { (e.target as HTMLElement).style.background = 'oklch(0.72 0.19 167)'; (e.target as HTMLElement).style.color = 'oklch(0.08 0.015 200)'; }}
                  onMouseLeave={e => { (e.target as HTMLElement).style.background = 'oklch(0.72 0.19 167 / 0.1)'; (e.target as HTMLElement).style.color = 'oklch(0.72 0.19 167)'; }}>
                  <Play size={12} /> Start Learning
                </button>
              </div>
            </motion.div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full glass-panel py-16 flex flex-col items-center text-center">
            <BookOpen size={36} className="mb-3 text-[oklch(0.3_0.02_210)]" />
            <p className="text-sm text-[oklch(0.5_0.02_210)] mb-2">
              {search ? `No courses matching "${search}"` : 'No courses available yet.'}
            </p>
            {search && (
              <button onClick={() => setSearch('')} className="text-xs text-[oklch(0.72_0.19_167)] hover:underline">
                Clear search
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Courses;
