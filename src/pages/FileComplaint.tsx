import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  createComplaint,
  uploadComplaintImage,
  checkSubmissionRateLimit,
  normalizePhoneNumber,
} from '../services/complaint.service';
import {
  User,
  Phone,
  Building2,
  FileText,
  MessageSquare,
  Upload,
  CheckCircle2,
  AlertCircle,
  CheckCircle,
  Copy,
  Zap,
  MapPin,
  Briefcase,
  Layers,
  Wrench,
  Shield,
  Home,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const PLANT_NAME = 'SAIL MIOM, CMLO';

const EMPLOYMENT_TYPES = ['Employ', 'Others'] as const;

const DEPARTMENTS = [
  'Electrical',
  'Civil',
  'Mechanical',
  'Geology',
  'HR',
  'MM',
  'CC',
  'CISF',
  'KVS Teacher',
  'Others',
] as const;

const LOCATION_TYPES = ['Plant', 'Township'] as const;

const PLANT_LOCATIONS = [
  'Crushing',
  'Screening',
  'OHP',
  'Mining',
  'Services',
  'Mining Shelter',
  'General Office',
  'Mechanical Services',
  'Geological Office',
  'Others',
] as const;

const TOWNSHIP_LOCATIONS = [
  'CISF Office',
  'Bank of India',
  'New B-Type Quarter',
  'C-Type Quarter',
  'D-Type Quarter',
  'Meghalaya Guest House-1',
  'Guest House 2',
  'Community Center',
  'Megha Club',
  'A Type Quarter',
  'Apex Office',
  'Civil Office',
  'Others',
] as const;

const NATURE_OF_COMPLAINT_OPTIONS = [
  'Electrical wiring issue',
  'Switch board / switch / socket / 3-pin / 5-pin',
  'Mains supply (MCB / KitKat fuse)',
  'Energy meter',
  'Street Light',
  'Earthing',
  'Fan',
  'Short Circuit',
  'Light Holder',
  'House Wiring',
  'Air Conditioner (Office only)',
  'Other complaints related to electrical',
] as const;

interface ComplaintFormData {
  plantName: string;
  name: string;
  employmentType: string;
  personalNo: string;
  phone: string;
  department: string;
  specifiedDepartment: string;
  locationType: '' | 'Plant' | 'Township';
  selectedLocation: string;
  specifiedLocation: string;
  qtrNo: string;
  natureOfComplaint: string;
  otherComplaintDetails: string;
  description: string;
}

const initialFormData: ComplaintFormData = {
  plantName: PLANT_NAME,
  name: '',
  employmentType: '',
  personalNo: '',
  phone: '',
  department: '',
  specifiedDepartment: '',
  locationType: '',
  selectedLocation: '',
  specifiedLocation: '',
  qtrNo: '',
  natureOfComplaint: '',
  otherComplaintDetails: '',
  description: '',
};

const FileComplaint = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<ComplaintFormData>(initialFormData);

  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [ticketId, setTicketId] = useState('');
  const [copied, setCopied] = useState(false);
  const [submittedData, setSubmittedData] = useState<ComplaintFormData | null>(null);

  const getWordCount = (str: string): number => {
    const trimmed = str.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  };

  const formatRemainingTime = (hours: number): string => {
    const cappedHours = Math.min(24, Math.max(0, hours));
    const h = Math.floor(cappedHours);
    const m = Math.ceil((cappedHours - h) * 60);
    let displayH = h;
    let displayM = m;
    if (displayM === 60) {
      displayH += 1;
      displayM = 0;
    }

    if (displayH === 0) {
      return `${displayM} minute(s)`;
    }
    if (displayM === 0) {
      return `${displayH} hour(s)`;
    }
    return `${displayH} hour(s) and ${displayM} minute(s)`;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setFormData((prev) => ({
      ...prev,
      department: val,
      specifiedDepartment: '',
    }));
  };

  const handleLocationTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as '' | 'Plant' | 'Township';
    setFormData((prev) => ({
      ...prev,
      locationType: newType,
      selectedLocation: '',
      specifiedLocation: '',
      qtrNo: '',
    }));
  };

  const handlePlantLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setFormData((prev) => ({
      ...prev,
      selectedLocation: val,
      specifiedLocation: '',
    }));
  };

  const handleTownshipLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setFormData((prev) => ({
      ...prev,
      selectedLocation: val,
      specifiedLocation: '',
    }));
  };

  const handleSpecifyLocationChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const words = val.trim().split(/\s+/).filter(Boolean);
    if (words.length > 25) {
      // Prevent typing additional words beyond 25
      const allowed = words.slice(0, 25).join(' ');
      setFormData((prev) => ({ ...prev, specifiedLocation: allowed }));
      return;
    }
    setFormData((prev) => ({ ...prev, specifiedLocation: val }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB');
        return;
      }

      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file');
        return;
      }

      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }

      setImage(file);
      setImagePreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleSubmitAnother = () => {
    setSubmitted(false);
    setTicketId('');
    setSubmittedData(null);
    setCopied(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation for required fields
    if (!formData.name.trim()) {
      setError('Please enter Name of Complaining Person');
      return;
    }

    if (!formData.employmentType) {
      setError('Please select Employment Type');
      return;
    }

    if (formData.employmentType === 'Employ' && !formData.personalNo.trim()) {
      setError('Please enter Personal No.');
      return;
    }

    if (!formData.phone.trim()) {
      setError('Please enter Mobile No.');
      return;
    }

    // Phone number validation (must normalize to exactly 10 digits)
    const normalizedPhone = normalizePhoneNumber(formData.phone);
    if (normalizedPhone.length !== 10 || !/^\d{10}$/.test(normalizedPhone)) {
      setError('Please enter a valid 10-digit mobile number (e.g. 9876543210)');
      return;
    }

    if (!formData.department) {
      setError('Please select Department');
      return;
    }

    if (formData.department === 'Others' && !formData.specifiedDepartment.trim()) {
      setError('Please specify your department.');
      return;
    }

    if (!formData.locationType) {
      setError('Please select a location type.');
      return;
    }

    if (formData.locationType === 'Plant') {
      if (!formData.selectedLocation) {
        setError('Please select a plant location.');
        return;
      }
      if (!formData.specifiedLocation.trim()) {
        setError(
          formData.selectedLocation === 'Others'
            ? 'Please specify the exact plant location.'
            : 'Please specify the exact location.'
        );
        return;
      }
      const specifiedWords = getWordCount(formData.specifiedLocation);
      if (specifiedWords > 25) {
        setError('Location description must be 25 words or fewer.');
        return;
      }
    } else if (formData.locationType === 'Township') {
      if (!formData.selectedLocation) {
        setError('Please select a township location.');
        return;
      }
      if (formData.selectedLocation === 'Others') {
        if (!formData.specifiedLocation.trim()) {
          setError('Please specify the exact township location.');
          return;
        }
        const specifiedWords = getWordCount(formData.specifiedLocation);
        if (specifiedWords > 25) {
          setError('Location description must be 25 words or fewer.');
          return;
        }
      }
      if (!formData.qtrNo.trim()) {
        setError('Please enter Qtr No.');
        return;
      }
    }

    if (!formData.natureOfComplaint) {
      setError('Please select Nature of Complaint');
      return;
    }

    if (
      formData.natureOfComplaint === 'Other complaints related to electrical' &&
      !formData.otherComplaintDetails.trim()
    ) {
      setError('Please enter details for "Other complaints related to electrical"');
      return;
    }

    if (!formData.description.trim()) {
      setError('Please enter Complaint Description');
      return;
    }

    // Description word count validation (max 200 words)
    const descriptionWords = getWordCount(formData.description);
    if (descriptionWords > 200) {
      setError(`Description cannot exceed 200 words (currently ${descriptionWords} words)`);
      return;
    }

    setLoading(true);

    try {
      const emailToUse = currentUser?.email || `${normalizedPhone}@sail-miom.internal`;

      // Check 24-hour rate limit
      const rateLimitCheck = await checkSubmissionRateLimit(emailToUse, formData.phone);
      if (rateLimitCheck.limited) {
        const remainingTimeStr = formatRemainingTime(rateLimitCheck.remainingHours || 24);
        setError(
          `You have already submitted a complaint within the last 24 hours. Please wait ${remainingTimeStr} before submitting again.`
        );
        setLoading(false);
        return;
      }

      // Upload image to ImgBB if provided
      let imageUrl: string | undefined = undefined;
      if (image) {
        imageUrl = await uploadComplaintImage(image);
      }

      const fullNature =
        formData.natureOfComplaint === 'Other complaints related to electrical' &&
        formData.otherComplaintDetails.trim()
          ? `Other: ${formData.otherComplaintDetails.trim()}`
          : formData.natureOfComplaint;

      const isTownshipOthers = formData.locationType === 'Township' && formData.selectedLocation === 'Others';
      const hasSpecifiedLocation = (formData.locationType === 'Plant' || isTownshipOthers) && Boolean(formData.specifiedLocation.trim());

      const locationDetailsList = [
        `Location Type: ${formData.locationType}`,
        formData.locationType === 'Plant'
          ? `Plant Location: ${formData.selectedLocation}`
          : `Township Location: ${formData.selectedLocation}`,
        ...(hasSpecifiedLocation
          ? [`Specified Location: ${formData.specifiedLocation.trim()}`]
          : []),
        ...(formData.locationType === 'Township' && formData.qtrNo.trim()
          ? [`Qtr No.: ${formData.qtrNo.trim()}`]
          : []),
        `Plant Name: ${formData.plantName}`,
        `Employment Type: ${formData.employmentType}`,
      ];

      const fullDescription = `${formData.description.trim()}\n\n[Location & Posting Details]\n${locationDetailsList.join(
        ' | '
      )}`;

      const finalDepartment =
        formData.department === 'Others'
          ? formData.specifiedDepartment.trim()
          : formData.department.trim();

      // Map to existing complaint model for complete compatibility
      const complaintData = {
        name: formData.name.trim(),
        email: emailToUse,
        phone: normalizedPhone,
        employeeId: formData.personalNo.trim(),
        personalNo: formData.personalNo.trim(),
        department: finalDepartment,
        designation: formData.employmentType.trim(),
        employmentType: formData.employmentType.trim(),
        category: fullNature,
        title: fullNature,
        description: fullDescription,
        priority: 'medium' as const,
        uid: currentUser?.uid || 'anonymous',
        userEmail: currentUser?.email || emailToUse,
        locationType: formData.locationType,
        selectedLocation: formData.selectedLocation,
        ...(formData.locationType === 'Plant'
          ? {
              plantLocation: formData.selectedLocation,
              complaintLocation: formData.selectedLocation,
              ...(hasSpecifiedLocation
                ? {
                    specifiedLocation: formData.specifiedLocation.trim(),
                    plantLocationDetails: formData.specifiedLocation.trim(),
                  }
                : {}),
            }
          : {}),
        ...(formData.locationType === 'Township'
          ? {
              townshipLocation: formData.selectedLocation,
              siteLocation: formData.selectedLocation,
              qtrNo: formData.qtrNo.trim(),
              ...(hasSpecifiedLocation
                ? {
                    specifiedLocation: formData.specifiedLocation.trim(),
                  }
                : {}),
            }
          : {}),
        ...(imageUrl ? { imageUrl } : {}),
      };

      const result = await createComplaint(complaintData);

      if (result.ticketId) {
        setTicketId(result.ticketId);
        setSubmittedData({ ...formData, department: finalDepartment });
        setSubmitted(true);
        setError('');

        setFormData(initialFormData);
        setImage(null);
        if (imagePreview) {
          URL.revokeObjectURL(imagePreview);
        }
        setImagePreview('');
      } else {
        setError('Failed to submit complaint. Please try again.');
        setSubmitted(false);
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Something went wrong. Please try again.');
      setSubmitted(false);
    } finally {
      setLoading(false);
    }
  };

  const descriptionWordCount = getWordCount(formData.description);
  const isWordLimitExceeded = descriptionWordCount > 200;
  const specifiedLocationWordCount = getWordCount(formData.specifiedLocation);

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        {/* Header */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-xs font-semibold text-[#2563EB] dark:text-blue-400 mb-3 border border-blue-100 dark:border-blue-900/50">
            <Zap className="w-3.5 h-3.5" />
            <span>Electrical Department Service Portal</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#111827] dark:text-[#F9FAFB] tracking-tight mb-3 font-headline">
            File a Complaint
          </h1>
          <p className="text-sm sm:text-base text-[#4B5563] dark:text-[#9CA3AF] max-w-xl mx-auto">
            Fill in the details below and our electrical maintenance team will attend to your request promptly.
          </p>
        </div>

        {/* Success Screen */}
        <AnimatePresence>
          {submitted && ticketId && submittedData && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-[#181B21] border border-[#E5E7EB] dark:border-[#2B313B] rounded-2xl p-6 sm:p-10 shadow-sm mb-8"
            >
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500 mb-3">
                  <CheckCircle className="w-9 h-9 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h2 className="text-2xl font-bold text-[#111827] dark:text-[#F9FAFB] mb-1">
                  Complaint Submitted Successfully
                </h2>
                <p className="text-[#4B5563] dark:text-[#9CA3AF] text-sm">
                  Your electrical maintenance request has been recorded in the system.
                </p>
              </div>

              {/* Ticket ID Box */}
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-xl p-5 mb-6">
                <p className="text-xs font-semibold text-[#2563EB] dark:text-blue-300 uppercase tracking-wider mb-1">
                  Your Unique Ticket ID
                </p>
                <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                  <span className="font-mono text-xl sm:text-2xl font-extrabold text-[#111827] dark:text-[#F9FAFB]">
                    {ticketId}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(ticketId);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="px-3.5 py-1.5 bg-white dark:bg-[#1E232B] hover:bg-slate-50 dark:hover:bg-[#252B35] border border-[#E5E7EB] dark:border-[#2B313B] text-[#2563EB] dark:text-blue-400 rounded-lg transition-colors flex items-center gap-1.5 font-medium text-sm shadow-xs"
                  >
                    <Copy className="w-4 h-4" />
                    {copied ? 'Copied!' : 'Copy Ticket ID'}
                  </button>
                </div>
              </div>

              {/* Submission Summary */}
              <div className="mb-8">
                <h3 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB] mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#2563EB]" />
                  Submission Summary
                </h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="bg-slate-50 dark:bg-[#12151B] p-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#2B313B]">
                    <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mb-0.5">Plant Name</p>
                    <p className="text-[#111827] dark:text-[#F9FAFB] font-medium text-sm">{submittedData.plantName}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-[#12151B] p-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#2B313B]">
                    <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mb-0.5">Complainant Name</p>
                    <p className="text-[#111827] dark:text-[#F9FAFB] font-medium text-sm">{submittedData.name}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-[#12151B] p-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#2B313B]">
                    <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mb-0.5">Employment Type</p>
                    <p className="text-[#111827] dark:text-[#F9FAFB] font-medium text-sm">{submittedData.employmentType}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-[#12151B] p-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#2B313B]">
                    <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mb-0.5">Personal No.</p>
                    <p className="text-[#111827] dark:text-[#F9FAFB] font-medium text-sm">{submittedData.personalNo || '—'}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-[#12151B] p-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#2B313B]">
                    <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mb-0.5">Mobile No.</p>
                    <p className="text-[#111827] dark:text-[#F9FAFB] font-medium text-sm">{submittedData.phone}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-[#12151B] p-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#2B313B]">
                    <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mb-0.5">Department</p>
                    <p className="text-[#111827] dark:text-[#F9FAFB] font-medium text-sm">{submittedData.department}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-[#12151B] p-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#2B313B]">
                    <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mb-0.5">Location Type</p>
                    <p className="text-[#111827] dark:text-[#F9FAFB] font-medium text-sm">{submittedData.locationType}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-[#12151B] p-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#2B313B]">
                    <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mb-0.5">
                      {submittedData.locationType === 'Plant' ? 'Plant Location' : 'Township Location'}
                    </p>
                    <p className="text-[#111827] dark:text-[#F9FAFB] font-medium text-sm">{submittedData.selectedLocation}</p>
                  </div>
                  {((submittedData.locationType === 'Plant') || (submittedData.locationType === 'Township' && submittedData.selectedLocation === 'Others')) && submittedData.specifiedLocation && (
                    <div className="bg-slate-50 dark:bg-[#12151B] p-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#2B313B] sm:col-span-2">
                      <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mb-0.5">Specified Location</p>
                      <p className="text-[#111827] dark:text-[#F9FAFB] font-medium text-sm">{submittedData.specifiedLocation}</p>
                    </div>
                  )}
                  {submittedData.locationType === 'Township' && submittedData.qtrNo && (
                    <div className="bg-slate-50 dark:bg-[#12151B] p-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#2B313B]">
                      <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mb-0.5">Qtr No.</p>
                      <p className="text-[#111827] dark:text-[#F9FAFB] font-medium text-sm">{submittedData.qtrNo}</p>
                    </div>
                  )}
                  <div className="bg-slate-50 dark:bg-[#12151B] p-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#2B313B] sm:col-span-2">
                    <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mb-0.5">Nature of Complaint</p>
                    <p className="text-[#111827] dark:text-[#F9FAFB] font-medium text-sm">
                      {submittedData.natureOfComplaint === 'Other complaints related to electrical'
                        ? `Other: ${submittedData.otherComplaintDetails}`
                        : submittedData.natureOfComplaint}
                    </p>
                    <p className="text-[#4B5563] dark:text-[#9CA3AF] text-xs mt-1 leading-relaxed whitespace-pre-wrap">
                      {submittedData.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleSubmitAnother}
                  className="flex-1 px-5 py-3 bg-white dark:bg-[#181B21] hover:bg-slate-50 dark:hover:bg-[#20252E] border border-[#E5E7EB] dark:border-[#2B313B] text-[#111827] dark:text-[#F9FAFB] rounded-xl font-semibold text-sm transition-colors shadow-xs flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4 text-[#2563EB]" />
                  Submit Another Complaint
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/track-complaint?ticket=${ticketId}`)}
                  className="flex-1 px-5 py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl font-semibold text-sm transition-colors shadow-xs flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Track This Complaint
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Message */}
        {error && !submitted && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl p-4 flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-800 dark:text-red-200 text-sm">Submission Error</h3>
              <p className="text-xs sm:text-sm text-red-700 dark:text-red-300 mt-0.5">{error}</p>
            </div>
          </motion.div>
        )}

        {/* Form */}
        {!submitted && (
          <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-[#181B21] border border-[#E5E7EB] dark:border-[#2B313B] rounded-2xl p-6 sm:p-10 shadow-sm"
          >
            <div className="space-y-6">
              {/* 1. Plant Name (Read-only) */}
              <div>
                <label className="block text-sm font-medium text-[#374151] dark:text-[#D1D5DB] mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#2563EB]" />
                    Plant Name
                  </span>
                  <span className="text-xs text-[#6B7280] dark:text-[#9CA3AF] bg-slate-100 dark:bg-[#1E232B] px-2 py-0.5 rounded">
                    Read-only
                  </span>
                </label>
                <input
                  type="text"
                  name="plantName"
                  value={formData.plantName}
                  readOnly
                  disabled
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] dark:border-[#2B313B] bg-slate-100 dark:bg-[#151921] text-[#4B5563] dark:text-[#9CA3AF] text-sm cursor-not-allowed select-none font-medium"
                />
              </div>

              {/* 2. Name of Complaining Person */}
              <div>
                <label className="block text-sm font-medium text-[#374151] dark:text-[#D1D5DB] mb-1.5 flex items-center gap-2">
                  <User className="w-4 h-4 text-[#9CA3AF]" />
                  <span>
                    Name of Complaining Person <span className="text-red-500">*</span>
                  </span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter full name of complaining person"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D1D5DB] dark:border-[#374151] bg-white dark:bg-[#111318] text-[#111827] dark:text-[#F9FAFB] placeholder:text-[#9CA3AF] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] transition-all"
                  required
                />
              </div>

              {/* 3. Employment Type */}
              <div>
                <label className="block text-sm font-medium text-[#374151] dark:text-[#D1D5DB] mb-1.5 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-[#9CA3AF]" />
                  <span>
                    Employment Type <span className="text-red-500">*</span>
                  </span>
                </label>
                <select
                  name="employmentType"
                  value={formData.employmentType}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D1D5DB] dark:border-[#374151] bg-white dark:bg-[#111318] text-[#111827] dark:text-[#F9FAFB] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] transition-all"
                  required
                >
                  <option value="" disabled>
                    -- Select Employment Type --
                  </option>
                  {EMPLOYMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. Personal No. */}
              <div>
                <label className="block text-sm font-medium text-[#374151] dark:text-[#D1D5DB] mb-1">
                  Personal No. {formData.employmentType !== 'Others' && <span className="text-red-500">*</span>}
                </label>
                <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mb-1.5">
                  Present place of posting
                </p>
                <input
                  type="text"
                  name="personalNo"
                  value={formData.personalNo}
                  onChange={handleChange}
                  placeholder="Enter personal number / place of posting"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D1D5DB] dark:border-[#374151] bg-white dark:bg-[#111318] text-[#111827] dark:text-[#F9FAFB] placeholder:text-[#9CA3AF] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] transition-all"
                  required={formData.employmentType !== 'Others'}
                />
              </div>

              {/* 5. Mobile No. */}
              <div>
                <label className="block text-sm font-medium text-[#374151] dark:text-[#D1D5DB] mb-1.5 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#9CA3AF]" />
                  <span>
                    Mobile No. <span className="text-red-500">*</span>
                  </span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="10-digit mobile number (e.g. 9876543210)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D1D5DB] dark:border-[#374151] bg-white dark:bg-[#111318] text-[#111827] dark:text-[#F9FAFB] placeholder:text-[#9CA3AF] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] transition-all"
                  required
                />
              </div>

              {/* 6. Department */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#374151] dark:text-[#D1D5DB] mb-1.5 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#9CA3AF]" />
                    <span>
                      Department <span className="text-red-500">*</span>
                    </span>
                  </label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleDepartmentChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#D1D5DB] dark:border-[#374151] bg-white dark:bg-[#111318] text-[#111827] dark:text-[#F9FAFB] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] transition-all"
                    required
                  >
                    <option value="" disabled>
                      -- Select Department --
                    </option>
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Conditional Specify Department Field when "Others" is selected */}
                {formData.department === 'Others' && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <label className="block text-sm font-medium text-[#374151] dark:text-[#D1D5DB] mb-1.5 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-[#9CA3AF]" />
                      <span>
                        Specify Department <span className="text-red-500">*</span>
                      </span>
                    </label>
                    <input
                      type="text"
                      name="specifiedDepartment"
                      value={formData.specifiedDepartment}
                      onChange={handleChange}
                      placeholder="Enter your department name"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#D1D5DB] dark:border-[#374151] bg-white dark:bg-[#111318] text-[#111827] dark:text-[#F9FAFB] placeholder:text-[#9CA3AF] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] transition-all"
                      required
                    />
                  </motion.div>
                )}
              </div>

              {/* 7. Location Section */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#374151] dark:text-[#D1D5DB] mb-1.5 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#2563EB]" />
                    <span>
                      Select Location <span className="text-red-500">*</span>
                    </span>
                  </label>
                  <select
                    name="locationType"
                    value={formData.locationType}
                    onChange={handleLocationTypeChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#D1D5DB] dark:border-[#374151] bg-white dark:bg-[#111318] text-[#111827] dark:text-[#F9FAFB] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] transition-all"
                    required
                  >
                    <option value="" disabled>
                      Select Location
                    </option>
                    {LOCATION_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Conditional Plant Fields */}
                {formData.locationType === 'Plant' && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-sm font-medium text-[#374151] dark:text-[#D1D5DB] mb-1.5 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-[#9CA3AF]" />
                        <span>
                          Plant Location <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <select
                        name="selectedLocation"
                        value={formData.selectedLocation}
                        onChange={handlePlantLocationChange}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#D1D5DB] dark:border-[#374151] bg-white dark:bg-[#111318] text-[#111827] dark:text-[#F9FAFB] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] transition-all"
                        required
                      >
                        <option value="" disabled>
                          -- Select Plant Location --
                        </option>
                        {PLANT_LOCATIONS.map((loc) => (
                          <option key={loc} value={loc}>
                            {loc}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-sm font-medium text-[#374151] dark:text-[#D1D5DB] flex items-center gap-2">
                          <FileText className="w-4 h-4 text-[#9CA3AF]" />
                          <span>
                            Specify Location <span className="text-red-500">*</span>
                          </span>
                        </label>
                        <span
                          className={`text-xs ${
                            specifiedLocationWordCount > 25
                              ? 'text-red-500 font-semibold'
                              : 'text-[#6B7280] dark:text-[#9CA3AF]'
                          }`}
                        >
                          {specifiedLocationWordCount} / 25 words
                        </span>
                      </div>
                      <textarea
                        name="specifiedLocation"
                        value={formData.specifiedLocation}
                        onChange={handleSpecifyLocationChange}
                        rows={3}
                        placeholder={
                          formData.selectedLocation === 'Others'
                            ? 'Specify the exact plant location'
                            : 'Specify the exact location of the complaint (maximum 25 words)'
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#D1D5DB] dark:border-[#374151] bg-white dark:bg-[#111318] text-[#111827] dark:text-[#F9FAFB] placeholder:text-[#9CA3AF] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] transition-all resize-none"
                        required
                      />
                    </div>
                  </motion.div>
                )}

                {/* Conditional Township Fields */}
                {formData.locationType === 'Township' && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-sm font-medium text-[#374151] dark:text-[#D1D5DB] mb-1.5 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-[#9CA3AF]" />
                        <span>
                          Township Location <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <select
                        name="selectedLocation"
                        value={formData.selectedLocation}
                        onChange={handleTownshipLocationChange}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#D1D5DB] dark:border-[#374151] bg-white dark:bg-[#111318] text-[#111827] dark:text-[#F9FAFB] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] transition-all"
                        required
                      >
                        <option value="" disabled>
                          -- Select Township Location --
                        </option>
                        {TOWNSHIP_LOCATIONS.map((loc) => (
                          <option key={loc} value={loc}>
                            {loc}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Conditional Specify Location for Township = Others */}
                    {formData.selectedLocation === 'Others' && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-sm font-medium text-[#374151] dark:text-[#D1D5DB] flex items-center gap-2">
                            <FileText className="w-4 h-4 text-[#9CA3AF]" />
                            <span>
                              Specify Location <span className="text-red-500">*</span>
                            </span>
                          </label>
                          <span
                            className={`text-xs ${
                              specifiedLocationWordCount > 25
                                ? 'text-red-500 font-semibold'
                                : 'text-[#6B7280] dark:text-[#9CA3AF]'
                            }`}
                          >
                            {specifiedLocationWordCount} / 25 words
                          </span>
                        </div>
                        <textarea
                          name="specifiedLocation"
                          value={formData.specifiedLocation}
                          onChange={handleSpecifyLocationChange}
                          rows={3}
                          placeholder="Specify the exact township location"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#D1D5DB] dark:border-[#374151] bg-white dark:bg-[#111318] text-[#111827] dark:text-[#F9FAFB] placeholder:text-[#9CA3AF] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] transition-all resize-none"
                          required
                        />
                      </motion.div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-[#374151] dark:text-[#D1D5DB] mb-1.5 flex items-center gap-2">
                        <Home className="w-4 h-4 text-[#9CA3AF]" />
                        <span>
                          Qtr No. <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <input
                        type="text"
                        name="qtrNo"
                        value={formData.qtrNo}
                        onChange={handleChange}
                        placeholder="Enter Qtr No."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#D1D5DB] dark:border-[#374151] bg-white dark:bg-[#111318] text-[#111827] dark:text-[#F9FAFB] placeholder:text-[#9CA3AF] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] transition-all"
                        required
                      />
                    </div>
                  </motion.div>
                )}
              </div>

              {/* 9. Nature of Complaint */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-[#374151] dark:text-[#D1D5DB] mb-1.5 flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-[#9CA3AF]" />
                    <span>
                      Nature of Complaint <span className="text-red-500">*</span>
                    </span>
                  </label>
                  <select
                    name="natureOfComplaint"
                    value={formData.natureOfComplaint}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#D1D5DB] dark:border-[#374151] bg-white dark:bg-[#111318] text-[#111827] dark:text-[#F9FAFB] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] transition-all"
                    required
                  >
                    <option value="" disabled>
                      -- Select Nature of Complaint --
                    </option>
                    {NATURE_OF_COMPLAINT_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Conditional Other Complaint Details */}
                {formData.natureOfComplaint === 'Other complaints related to electrical' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="pt-1"
                  >
                    <label className="block text-sm font-medium text-[#374151] dark:text-[#D1D5DB] mb-1.5">
                      Other Complaint Details <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="otherComplaintDetails"
                      value={formData.otherComplaintDetails}
                      onChange={handleChange}
                      placeholder="Please describe the nature of your electrical complaint"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#D1D5DB] dark:border-[#374151] bg-white dark:bg-[#111318] text-[#111827] dark:text-[#F9FAFB] placeholder:text-[#9CA3AF] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] transition-all"
                      required
                    />
                  </motion.div>
                )}
              </div>

              {/* 10. Complaint Description */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-[#374151] dark:text-[#D1D5DB] flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#9CA3AF]" />
                    <span>
                      Complaint Description <span className="text-red-500">*</span>
                    </span>
                  </label>
                  <span
                    className={`text-xs font-medium transition-colors ${
                      isWordLimitExceeded
                        ? 'text-red-600 dark:text-red-400 font-semibold'
                        : descriptionWordCount >= 180
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-[#6B7280] dark:text-[#9CA3AF]'
                    }`}
                  >
                    {descriptionWordCount} / 200 words
                  </span>
                </div>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Enter the detailed explanation of your problem (maximum 200 words)"
                  rows={5}
                  className={`w-full px-3.5 py-2.5 rounded-xl border bg-white dark:bg-[#111318] text-[#111827] dark:text-[#F9FAFB] placeholder:text-[#9CA3AF] text-sm focus:outline-none transition-all resize-none ${
                    isWordLimitExceeded
                      ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500'
                      : 'border-[#D1D5DB] dark:border-[#374151] focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB]'
                  }`}
                  required
                />
                {isWordLimitExceeded && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    Description exceeds the 200-word limit by {descriptionWordCount - 200} word
                    {descriptionWordCount - 200 === 1 ? '' : 's'}.
                  </p>
                )}
              </div>

              {/* 11. Upload Photograph (Optional) */}
              <div>
                <label className="block text-sm font-medium text-[#374151] dark:text-[#D1D5DB] mb-1.5 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-[#9CA3AF]" />
                  <span>Upload Photograph</span>
                  <span className="text-[#6B7280] text-xs font-normal">(Optional, max 5MB)</span>
                </label>
                <div className="border border-dashed border-[#D1D5DB] dark:border-[#374151] rounded-xl p-6 bg-slate-50/50 dark:bg-[#111318]/50 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="flex flex-col items-center justify-center cursor-pointer"
                  >
                    {imagePreview ? (
                      <div className="relative w-full">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="max-h-60 mx-auto rounded-lg shadow-xs"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            if (imagePreview) {
                              URL.revokeObjectURL(imagePreview);
                            }
                            setImage(null);
                            setImagePreview('');
                          }}
                          className="absolute top-2 right-2 bg-rose-600 text-white p-1.5 rounded-full shadow hover:bg-rose-700"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-[#9CA3AF] mb-2" />
                        <p className="text-sm font-medium text-[#111827] dark:text-[#F9FAFB] mb-0.5">
                          Click to upload photo of the issue
                        </p>
                        <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                          PNG, JPG, JPEG up to 5MB
                        </p>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* 12. Submit */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || isWordLimitExceeded}
                  className="w-full py-3.5 px-6 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-base shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Submitting Complaint...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Submit Complaint</span>
                    </>
                  )}
                </button>
              </div>

              {/* Info Note */}
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50">
                <p className="text-xs sm:text-sm text-[#1E40AF] dark:text-blue-300 leading-relaxed">
                  <span className="font-semibold">Note:</span> All fields marked with{' '}
                  <span className="text-red-500">*</span> are mandatory. Once submitted, an official
                  ticket ID will be generated for status tracking.
                </p>
              </div>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default FileComplaint;
