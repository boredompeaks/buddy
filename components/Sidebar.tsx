
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Note } from '../types';
import { 
    LayoutDashboard, CheckSquare, Plus, Search, PanelLeftClose, PanelLeftOpen, 
    BookOpen, Wand2, ChevronRight, ChevronDown, FileText, Youtube,
    Download, Upload
} from 'lucide-react';
import { SUBJECTS } from '../constants';
import { GlobalNotesSection } from './GlobalNotesSection';

interface SidebarProps {
    isOpen: boolean;
    setIsOpen: (v: boolean) => void;
    notes: Note[];
    addNote: () => Promise<void>;
    autoOrganize: () => Promise<void>;
    isOrganizing: boolean;
    organizeProgress: number;
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    onExport: () => void;
    onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
    isOpen, setIsOpen, notes, addNote, autoOrganize, isOrganizing, 
    organizeProgress, searchQuery, setSearchQuery, onExport, onImport
}) => {
    const location = useLocation();
    const navigate = useNavigate();
    const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>(
        SUBJECTS.reduce((acc, s) => ({...acc, [s]: true}), {})
    );

    const toggleSubject = (subject: string) => {
        setExpandedSubjects(prev => ({...prev, [subject]: !prev[subject]}));
    };

    // Group notes
    const notesBySubject = notes.reduce((acc, note) => {
        const subject = note.subject || 'General';
        if (!acc[subject]) acc[subject] = [];
        acc[subject].push(note);
        return acc;
    }, {} as Record<string, Note[]>);

    // Active subjects (only show subjects that have notes)
    const activeSubjects = SUBJECTS.filter(s => notesBySubject[s] && notesBySubject[s].length > 0);
    const otherSubjects = Object.keys(notesBySubject).filter(s => !SUBJECTS.includes(s));
    const allDisplaySubjects = [...activeSubjects, ...otherSubjects];

    const filteredNotes = notes.filter(n => 
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
        n.subject?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className={`flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ease-in-out ${isOpen ? 'w-80' : 'w-20'} shrink-0 z-20 shadow-xl`}>
            {/* Header */}
            <div className="h-16 flex items-center px-4 border-b border-gray-100 justify-between shrink-0 bg-white">
                {isOpen && (
                    <div className="font-extrabold text-xl text-indigo-600 flex items-center gap-2 tracking-tight">
                        <BookOpen className="w-7 h-7" />
                        MindVault
                    </div>
                )}
                <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-md mx-auto transition-colors">
                    {isOpen ? <PanelLeftClose className="w-5 h-5"/> : <PanelLeftOpen className="w-5 h-5" />}
                </button>
            </div>

            {/* Nav & Search */}
            <div className="p-4 space-y-3 border-b border-gray-100 shrink-0 bg-white">
                {isOpen ? (
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Search notes..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:bg-white transition-all"
                        />
                    </div>
                ) : (
                    <div className="flex justify-center py-2">
                        <Search className="w-5 h-5 text-gray-400" />
                    </div>
                )}

                <SidebarItem active={location.pathname === '/'} to="/" icon={LayoutDashboard} label="Dashboard" isOpen={isOpen} />
                <SidebarItem active={location.pathname === '/routine'} to="/routine" icon={CheckSquare} label="Routine" isOpen={isOpen} />
                
                <button 
                    onClick={() => addNote()}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 ${!isOpen ? 'justify-center' : ''}`}
                >
                    <Plus className="w-5 h-5" />
                    {isOpen && <span className="font-medium text-sm">New Note</span>}
                </button>
            </div>

            {/* Tree View */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 bg-white">
                {isOpen && (
                    <button 
                        onClick={autoOrganize}
                        disabled={isOrganizing}
                        className="w-full mb-6 flex items-center justify-between px-4 py-3 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all border border-indigo-100 group"
                    >
                        <span className="flex items-center gap-2">
                            <Wand2 className={`w-4 h-4 ${isOrganizing ? 'animate-spin' : ''}`} />
                            {isOrganizing ? `Organizing (${organizeProgress}%)` : 'Auto-Organize Library'}
                        </span>
                    </button>
                )}

                {searchQuery ? (
                     <div className="space-y-1">
                        {filteredNotes.map(note => (
                            <SidebarNoteLink key={note.id} note={note} isOpen={isOpen} />
                        ))}
                     </div>
                ) : (
                    <div className="space-y-4">
                        {allDisplaySubjects.map(subject => (
                            <div key={subject}>
                                {isOpen ? (
                                    <button 
                                        onClick={() => toggleSubject(subject)}
                                        className="w-full flex items-center gap-2 px-3 py-1 text-[11px] font-extrabold text-gray-500 hover:text-indigo-600 uppercase tracking-widest transition-colors mb-1"
                                    >
                                        {expandedSubjects[subject] ? <ChevronDown className="w-3 h-3"/> : <ChevronRight className="w-3 h-3"/>}
                                        {subject}
                                        <span className="ml-auto bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full text-[9px]">{notesBySubject[subject].length}</span>
                                    </button>
                                ) : (
                                    <div className="h-px bg-gray-200 my-2 mx-4" />
                                )}
                                
                                {(expandedSubjects[subject] || !isOpen) && (
                                    <div className={`${isOpen ? 'pl-2 space-y-0.5' : 'flex flex-col gap-1 items-center'}`}>
                                        {notesBySubject[subject].map(note => (
                                            <SidebarNoteLink key={note.id} note={note} isOpen={isOpen} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        {allDisplaySubjects.length === 0 && (
                            <div className="text-center text-xs text-gray-400 italic mt-10">No organized notes</div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-200 bg-gray-50 shrink-0">
                {isOpen ? (
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={onExport} className="flex flex-col items-center justify-center gap-1 text-[10px] font-bold text-gray-500 hover:text-indigo-600 p-2 hover:bg-indigo-50 rounded transition-colors border border-transparent hover:border-indigo-100">
                            <Download className="w-4 h-4" /> EXPORT
                        </button>
                        <label className="flex flex-col items-center justify-center gap-1 text-[10px] font-bold text-gray-500 hover:text-indigo-600 p-2 hover:bg-indigo-50 rounded cursor-pointer transition-colors border border-transparent hover:border-indigo-100">
                            <Upload className="w-4 h-4" /> IMPORT
                            <input type="file" className="hidden" accept=".json" onChange={onImport} />
                        </label>
                    </div>
                ) : (
                    <button onClick={onExport} className="flex justify-center w-full p-2 text-gray-400 hover:text-indigo-600">
                        <Download className="w-5 h-5" />
                    </button>
                )}
            </div>
        </div>
    );
};

const SidebarItem = ({ active, to, icon: Icon, label, isOpen }: any) => (
    <Link 
        to={to} 
        className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 group ${
        active 
        ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200 font-medium' 
        : 'text-gray-600 hover:bg-gray-100'
        } ${!isOpen ? 'justify-center' : ''}`}
    >
        <Icon className={`w-5 h-5 ${active ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
        {isOpen && <div className="text-sm">{label}</div>}
    </Link>
);

const SidebarNoteLink = ({ note, isOpen }: { note: Note, isOpen: boolean }) => {
    const location = useLocation();
    const isActive = location.pathname === `/note/${note.id}`;
    
    return (
        <Link 
            to={`/note/${note.id}`}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group ${
                isActive 
                ? 'bg-indigo-50 text-indigo-700 font-medium' 
                : 'text-slate-600 hover:bg-gray-100 hover:pl-4'
            } ${!isOpen ? 'justify-center px-2' : ''}`}
            title={note.title}
        >
             <div className={`shrink-0 ${isActive ? 'text-indigo-500' : 'text-gray-300 group-hover:text-gray-400'}`}>
                {note.content.includes('youtube') ? <Youtube className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
             </div>

            {isOpen && (
                <div className="truncate text-sm w-full">
                    {note.title || "Untitled"}
                </div>
            )}
        </Link>
    );
}
