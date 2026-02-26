import {
  X,
  Type,
  Text,
  CheckSquare,
  List,
  Star,
  Mail,
  Hash,
  ChevronDown,
  Image,
  ToggleLeft,
  Scale,
  ThumbsUp,
  BarChart2,
  AlignLeft,
  Calendar,
  Upload,
  Video,
  User,
  Phone,
  MapPin,
  Globe,
  FileText,
  Monitor,
  MessageSquare,
  Flag,
  GripVertical,
  Grid,
} from 'lucide-react';
import type { SurveyQuestionType } from '../lib/types';

interface ContentItem {
  type: SurveyQuestionType;
  label: string;
  icon: React.ReactNode;
  color: string;
}

interface ContentCategory {
  label: string;
  items: ContentItem[];
}

const CONTENT_CATEGORIES: ContentCategory[] = [
  {
    label: 'Contact info',
    items: [
      { type: 'contact_info', label: 'Contact Info', icon: <User className="w-4 h-4" />, color: 'bg-amber-100 text-amber-600' },
      { type: 'email', label: 'Email', icon: <Mail className="w-4 h-4" />, color: 'bg-amber-100 text-amber-600' },
      { type: 'phone_number', label: 'Phone Number', icon: <Phone className="w-4 h-4" />, color: 'bg-amber-100 text-amber-600' },
      { type: 'address', label: 'Address', icon: <MapPin className="w-4 h-4" />, color: 'bg-amber-100 text-amber-600' },
      { type: 'website', label: 'Website', icon: <Globe className="w-4 h-4" />, color: 'bg-amber-100 text-amber-600' },
    ],
  },
  {
    label: 'Text & Video',
    items: [
      { type: 'long_text', label: 'Long Text', icon: <AlignLeft className="w-4 h-4" />, color: 'bg-blue-100 text-blue-600' },
      { type: 'short_text', label: 'Short Text', icon: <Type className="w-4 h-4" />, color: 'bg-blue-100 text-blue-600' },
      { type: 'video', label: 'Video', icon: <Video className="w-4 h-4" />, color: 'bg-blue-100 text-blue-600' },
    ],
  },
  {
    label: 'Choice',
    items: [
      { type: 'multiple_choice', label: 'Multiple Choice', icon: <CheckSquare className="w-4 h-4" />, color: 'bg-slate-100 text-slate-600' },
      { type: 'dropdown', label: 'Dropdown', icon: <ChevronDown className="w-4 h-4" />, color: 'bg-slate-100 text-slate-600' },
      { type: 'picture_choice', label: 'Picture Choice', icon: <Image className="w-4 h-4" />, color: 'bg-slate-100 text-slate-600' },
      { type: 'yes_no', label: 'Yes / No', icon: <ToggleLeft className="w-4 h-4" />, color: 'bg-slate-100 text-slate-600' },
      { type: 'legal', label: 'Legal', icon: <Scale className="w-4 h-4" />, color: 'bg-slate-100 text-slate-600' },
    ],
  },
  {
    label: 'Rating & ranking',
    items: [
      { type: 'nps', label: 'Net Promoter Score', icon: <ThumbsUp className="w-4 h-4" />, color: 'bg-emerald-100 text-emerald-600' },
      { type: 'opinion_scale', label: 'Opinion Scale', icon: <BarChart2 className="w-4 h-4" />, color: 'bg-emerald-100 text-emerald-600' },
      { type: 'rating', label: 'Rating', icon: <Star className="w-4 h-4" />, color: 'bg-emerald-100 text-emerald-600' },
      { type: 'ranking', label: 'Ranking', icon: <GripVertical className="w-4 h-4" />, color: 'bg-emerald-100 text-emerald-600' },
      { type: 'matrix', label: 'Matrix', icon: <Grid className="w-4 h-4" />, color: 'bg-emerald-100 text-emerald-600' },
    ],
  },
  {
    label: 'Other',
    items: [
      { type: 'number', label: 'Number', icon: <Hash className="w-4 h-4" />, color: 'bg-yellow-100 text-yellow-600' },
      { type: 'date', label: 'Date', icon: <Calendar className="w-4 h-4" />, color: 'bg-yellow-100 text-yellow-600' },
      { type: 'file_upload', label: 'File Upload', icon: <Upload className="w-4 h-4" />, color: 'bg-yellow-100 text-yellow-600' },
    ],
  },
  {
    label: 'Screens & structure',
    items: [
      { type: 'welcome_screen', label: 'Welcome Screen', icon: <Monitor className="w-4 h-4" />, color: 'bg-rose-100 text-rose-600' },
      { type: 'statement', label: 'Statement', icon: <MessageSquare className="w-4 h-4" />, color: 'bg-rose-100 text-rose-600' },
      { type: 'end_screen', label: 'End Screen', icon: <Flag className="w-4 h-4" />, color: 'bg-rose-100 text-rose-600' },
    ],
  },
];

interface AddContentModalProps {
  onSelect: (type: SurveyQuestionType) => void;
  onClose: () => void;
}

export default function AddContentModal({ onSelect, onClose }: AddContentModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">Add content</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          <div className="grid grid-cols-3 gap-8">
            {CONTENT_CATEGORIES.map((cat) => (
              <div key={cat.label}>
                <p className="text-xs font-semibold text-slate-500 mb-3">{cat.label}</p>
                <div className="space-y-1">
                  {cat.items.map((item) => (
                    <button
                      key={item.type}
                      onClick={() => { onSelect(item.type); onClose(); }}
                      className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-slate-50 transition-colors text-left group"
                    >
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${item.color}`}>
                        {item.icon}
                      </span>
                      <span className="text-sm text-slate-700 group-hover:text-slate-900 transition-colors">
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
