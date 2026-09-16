import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  FileText,
  Search,
  Shield,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  MapPin,
  Navigation,
  Zap,
  ArrowRight,
  Phone,
} from 'lucide-react';
import { subscribeToComplaintStats, ComplaintStats } from '../services/complaint.service';

const Home = () => {
  const [stats, setStats] = useState<ComplaintStats>({
    total: 0,
    pending: 0,
    assigned: 0,
    active: 0,
    resolved: 0,
    rejected: 0,
  });

  const [currentSlide, setCurrentSlide] = useState(0);

  const slideshowImages = [
    '/gallery-1.jpg',
    '/gallery-2.jpg',
    '/gallery-3.jpg',
    '/gallery-4.jpg',
  ];

  useEffect(() => {
    const unsubscribe = subscribeToComplaintStats((newStats) => {
      setStats(newStats);
    });

    return () => unsubscribe();
  }, []);

  // Auto-rotate slideshow every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slideshowImages.length);
    }, 8000);

    return () => clearInterval(interval);
  }, [slideshowImages.length]);

  const statCards = [
    {
      label: 'Total Complaints',
      value: stats.total,
      icon: FileText,
      iconColor: 'text-[#2563EB]',
      iconBg: 'bg-blue-50 dark:bg-blue-950/40',
      badgeColor: 'text-[#2563EB]',
    },
    {
      label: 'Pending',
      value: stats.pending,
      icon: Clock,
      iconColor: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-50 dark:bg-amber-950/40',
      badgeColor: 'text-amber-600 dark:text-amber-400',
    },
    {
      label: 'Assigned',
      value: stats.assigned,
      icon: Users,
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      iconBg: 'bg-indigo-50 dark:bg-indigo-950/40',
      badgeColor: 'text-indigo-600 dark:text-indigo-400',
    },
    {
      label: 'Active',
      value: stats.active,
      icon: TrendingUp,
      iconColor: 'text-purple-600 dark:text-purple-400',
      iconBg: 'bg-purple-50 dark:bg-purple-950/40',
      badgeColor: 'text-purple-600 dark:text-purple-400',
    },
    {
      label: 'Resolved',
      value: stats.resolved,
      icon: CheckCircle,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/40',
      badgeColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Rejected',
      value: stats.rejected,
      icon: XCircle,
      iconColor: 'text-rose-600 dark:text-rose-400',
      iconBg: 'bg-rose-50 dark:bg-rose-950/40',
      badgeColor: 'text-rose-600 dark:text-rose-400',
    },
  ];

  const features = [
    {
      icon: Zap,
      title: 'Prompt Electrical Support',
      description:
        'Quick logging and dispatch for power supply, lighting, wiring, switchboards, and domestic appliance issues.',
    },
    {
      icon: Search,
      title: 'Real-Time Tracking',
      description:
        'Monitor ticket status and electrical maintenance updates in real-time with your unique Complaint ID.',
    },
    {
      icon: Shield,
      title: 'Verified & Secure',
      description:
        'Directly managed by the SAIL-MIOM electrical engineering and maintenance team with accountable tracking.',
    },
  ];

  return (
    <div className="min-h-screen pt-20 sm:pt-24 pb-16">
      {/* Hero Section */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-12 sm:mb-16">
        <div className="rounded-3xl overflow-hidden border border-[#E5E7EB] dark:border-[#2B313B] bg-white dark:bg-[#181B21] shadow-sm">
          {/* Sharp, Clear, Fully Visible Hero Image */}
          <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] max-h-[520px]">
            <img
              src="/hero.png"
              alt="SAIL MIOM Mining Machinery"
              className="w-full h-full object-cover object-center"
            />
          </div>

          {/* Hero Heading & Action Buttons Side-by-Side */}
          <div className="py-6 sm:py-8 px-4 flex flex-col items-center justify-center text-center max-w-2xl mx-auto">
            <h1 className="text-2xl sm:text-4xl font-extrabold text-[#111827] dark:text-[#F9FAFB] tracking-tight mb-6 font-headline">
              Electrical Maintenance System
            </h1>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full">
              <Link to="/file-complaint" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto min-w-[220px] h-12 px-6 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm sm:text-base shadow-xs transition-all flex items-center justify-center gap-2 group">
                  <Zap className="w-4 h-4" />
                  <span>File an Electrical Complaint</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
              <Link to="/track-complaint" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto min-w-[220px] h-12 px-6 rounded-xl bg-white hover:bg-slate-50 dark:bg-[#181B21] dark:hover:bg-[#20252E] border border-[#D1D5DB] dark:border-[#374151] hover:border-[#2563EB] dark:hover:border-[#3B82F6] text-[#111827] dark:text-[#F9FAFB] hover:text-[#2563EB] dark:hover:text-[#3B82F6] font-semibold text-sm sm:text-base shadow-xs transition-all flex items-center justify-center gap-2">
                  <Search className="w-4 h-4" />
                  <span>Track Complaint</span>
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Live Statistics Section */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-16 sm:mb-24">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#111827] dark:text-[#F9FAFB] tracking-tight mb-3">
            Live Electrical Complaint Statistics
          </h2>
          <p className="text-sm sm:text-base text-[#4B5563] dark:text-[#9CA3AF]">
            Real-time status overview of all maintenance requests across quarters and facilities
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * index }}
                className="bg-white dark:bg-[#181B21] border border-[#E5E7EB] dark:border-[#2B313B] rounded-2xl p-5 text-center shadow-xs hover:shadow-md transition-shadow"
              >
                <div
                  className={`w-11 h-11 mx-auto mb-3.5 rounded-xl ${stat.iconBg} ${stat.iconColor} flex items-center justify-center`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#111827] dark:text-[#F9FAFB] mb-1 tracking-tight">
                  {stat.value}
                </div>
                <div className="text-xs sm:text-sm font-medium text-[#4B5563] dark:text-[#9CA3AF]">
                  {stat.label}
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-16 sm:mb-24">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#111827] dark:text-[#F9FAFB] tracking-tight mb-3">
            Why Choose Our System?
          </h2>
          <p className="text-sm sm:text-base text-[#4B5563] dark:text-[#9CA3AF]">
            Structured, accountable, and prompt electrical maintenance management
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 * index }}
                className="bg-white dark:bg-[#181B21] border border-[#E5E7EB] dark:border-[#2B313B] rounded-2xl p-7 text-center shadow-xs hover:border-[#2563EB]/40 transition-colors"
              >
                <div className="w-13 h-13 mx-auto mb-5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-[#2563EB] dark:text-blue-400 flex items-center justify-center">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-[#111827] dark:text-[#F9FAFB] mb-2.5">
                  {feature.title}
                </h3>
                <p className="text-sm sm:text-base text-[#4B5563] dark:text-[#9CA3AF] leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto mb-16 sm:mb-24">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#111827] dark:text-[#F9FAFB] tracking-tight mb-3">
            How It Works
          </h2>
          <p className="text-sm sm:text-base text-[#4B5563] dark:text-[#9CA3AF]">
            Simple 4-step workflow to get your electrical issues resolved quickly
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {[
            {
              step: '01',
              title: 'File Electrical Complaint',
              description:
                'Fill out the simple form detailing the electrical issue, location, quarter number, and attach photos if needed.',
            },
            {
              step: '02',
              title: 'Get Instant Tracking ID',
              description:
                'Receive a unique complaint reference code to check live progress anytime without logging in.',
            },
            {
              step: '03',
              title: 'Review & Electrician Assignment',
              description:
                'Electrical department supervisors inspect the ticket and allocate duty technicians.',
            },
            {
              step: '04',
              title: 'Prompt On-Site Resolution',
              description:
                'Technicians resolve the issue, record completion notes, and close the complaint.',
            },
          ].map((item, index) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.08 * index }}
              className="bg-white dark:bg-[#181B21] border border-[#E5E7EB] dark:border-[#2B313B] rounded-2xl p-6 flex items-start gap-4 shadow-xs"
            >
              <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#2563EB] dark:text-blue-400 flex items-center justify-center flex-shrink-0 text-base font-bold">
                {item.step}
              </div>
              <div className="flex-1">
                <h3 className="text-base sm:text-lg font-bold text-[#111827] dark:text-[#F9FAFB] mb-1.5">
                  {item.title}
                </h3>
                <p className="text-sm text-[#4B5563] dark:text-[#9CA3AF] leading-relaxed">
                  {item.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Contact Us & Slideshow Section */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Left Column - Contact Us */}
          <div className="bg-white dark:bg-[#181B21] border border-[#E5E7EB] dark:border-[#2B313B] rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col justify-between">
            <div>
              <h2 className="text-2xl font-bold text-[#111827] dark:text-[#F9FAFB] mb-2">
                Electrical Department Helpdesk
              </h2>
              <p className="text-sm text-[#4B5563] dark:text-[#9CA3AF] mb-8">
                Reach out directly for urgent electrical assistance or emergency power outages.
              </p>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">
                      Office Address
                    </h3>
                    <p className="text-base text-[#4B5563] dark:text-[#9CA3AF] mt-0.5 leading-relaxed">
                      Electrical Department, SAIL Meghahatuburu Iron Ore Mine, Jharkhand, India (PIN ~ 833223)
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#2563EB] dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div className="w-full">
                    <h3 className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB] mb-2.5">
                      Helpdesk Contacts
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2 p-3 rounded-xl bg-slate-50 dark:bg-[#111318] border border-[#E5E7EB] dark:border-[#2B313B]">
                        <div>
                          <p className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">
                            N K Sonkusare
                          </p>
                          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                            GM I/c (Elect)
                          </p>
                        </div>
                        <a
                          href="tel:8986881139"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-[#181B21] border border-[#E5E7EB] dark:border-[#2B313B] text-sm font-semibold text-[#2563EB] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors shadow-xs"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>8986881139</span>
                        </a>
                      </div>

                      <div className="flex items-center justify-between flex-wrap gap-2 p-3 rounded-xl bg-slate-50 dark:bg-[#111318] border border-[#E5E7EB] dark:border-[#2B313B]">
                        <div>
                          <p className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">
                            Vikas Aanad
                          </p>
                          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                            Mgr (Elect)
                          </p>
                        </div>
                        <a
                          href="tel:8986881009"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-[#181B21] border border-[#E5E7EB] dark:border-[#2B313B] text-sm font-semibold text-[#2563EB] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors shadow-xs"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>8986881009</span>
                        </a>
                      </div>

                      <div className="flex items-center justify-between flex-wrap gap-2 p-3 rounded-xl bg-slate-50 dark:bg-[#111318] border border-[#E5E7EB] dark:border-[#2B313B]">
                        <div>
                          <p className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">
                            Mohan Nag
                          </p>
                          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                            Jr Engg
                          </p>
                        </div>
                        <a
                          href="tel:7633824775"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-[#181B21] border border-[#E5E7EB] dark:border-[#2B313B] text-sm font-semibold text-[#2563EB] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors shadow-xs"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>7633824775</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>


                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                    <Navigation className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">
                      Location Map
                    </h3>
                    <a
                      href="https://maps.app.goo.gl/HXMgJEyijcEmSwvH9"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[#2563EB] hover:text-[#1D4ED8] hover:underline font-medium text-sm mt-1"
                    >
                      <span>Get Directions on Google Maps</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-[#E5E7EB] dark:border-[#2B313B]">
              <span className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                Operating Hours: 24x7 Emergency Electrical Breakdown Service
              </span>
            </div>
          </div>

          {/* Right Column - Image Slideshow */}
          <div className="bg-white dark:bg-[#181B21] border border-[#E5E7EB] dark:border-[#2B313B] rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-center">
            <div className="relative w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800" style={{ paddingBottom: '66.67%' }}>
              {slideshowImages.map((image, index) => (
                <div
                  key={index}
                  className="absolute inset-0 transition-opacity duration-700 ease-in-out"
                  style={{ opacity: index === currentSlide ? 1 : 0 }}
                >
                  <img
                    src={image}
                    alt={`Slide ${index + 1}`}
                    className="w-full h-full object-cover rounded-xl"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>

            {/* Dot Indicators */}
            <div className="flex justify-center gap-2 mt-4">
              {slideshowImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${index === currentSlide
                      ? 'w-6 bg-[#2563EB]'
                      : 'w-2 bg-slate-300 dark:bg-slate-700'
                    }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
