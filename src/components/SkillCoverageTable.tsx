import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Users, UserX, FileCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import type { JobSkill } from '../types';

interface SkillCoverageTableProps {
  skills: JobSkill[];
  onViewMatching: (skillName: string) => void;
  onViewMissing: (skillName: string) => void;
  onViewEvidence?: (skillName: string) => void;
}

export function SkillCoverageTable({
  skills,
  onViewMatching,
  onViewMissing,
  onViewEvidence,
}: SkillCoverageTableProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="skill-table-card">
      <div className="table-header-block">
        <div>
          <h3>Skill Coverage Analysis</h3>
          <p>Extracted from Job Description. Click matching or missing counts to inspect candidates.</p>
        </div>
        <div className="coverage-meta">
          <span className="badge badge-subtle">
            <b>{skills.length}</b> Skills Extracted
          </span>
          <span className="badge badge-required-subtle">
            <b>{skills.filter((s) => s.priority === 'required').length}</b> Required
          </span>
          <span className="badge badge-preferred-subtle">
            <b>{skills.filter((s) => s.priority === 'preferred').length}</b> Preferred
          </span>
        </div>
      </div>

      <div className="table-responsive">
        <table className="skill-table">
          <thead>
            <tr>
              <th scope="col">Skill</th>
              <th scope="col">Category</th>
              <th scope="col">Priority</th>
              <th scope="col" className="text-center">Matching Candidates</th>
              <th scope="col" className="text-center">Missing</th>
              <th scope="col" className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {skills.map((skill) => {
              const isMenuOpen = activeMenu === skill.name;
              const totalCandidates = skill.matchingCount + skill.missingCount;
              const coveragePct = Math.round((skill.matchingCount / (totalCandidates || 1)) * 100);

              return (
                <tr key={skill.name} className="skill-row">
                  <td className="skill-name-cell">
                    <div className="skill-title-wrap">
                      <b>{skill.name}</b>
                      <div className="skill-coverage-bar" title={`${coveragePct}% candidate coverage`}>
                        <div
                          className={`bar-fill ${coveragePct >= 70 ? 'high' : coveragePct >= 45 ? 'medium' : 'low'}`}
                          style={{ width: `${coveragePct}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="category-tag">{skill.category}</span>
                  </td>
                  <td>
                    <span className={`priority-badge ${skill.priority}`}>
                      {skill.priority === 'required' ? (
                        <>
                          <CheckCircle2 size={12} /> Required
                        </>
                      ) : (
                        <>
                          <AlertCircle size={12} /> Preferred
                        </>
                      )}
                    </span>
                  </td>
                  <td className="text-center">
                    <button
                      type="button"
                      className="count-pill match-pill"
                      onClick={() => onViewMatching(skill.name)}
                      title={`View ${skill.matchingCount} candidates matching ${skill.name}`}
                      aria-label={`View ${skill.matchingCount} matching candidates for ${skill.name}`}
                    >
                      <Users size={13} />
                      <span>{skill.matchingCount}</span>
                    </button>
                  </td>
                  <td className="text-center">
                    <button
                      type="button"
                      className="count-pill missing-pill"
                      onClick={() => onViewMissing(skill.name)}
                      title={`View ${skill.missingCount} candidates with insufficient evidence for ${skill.name}`}
                      aria-label={`View ${skill.missingCount} candidates missing ${skill.name}`}
                    >
                      <UserX size={13} />
                      <span>{skill.missingCount}</span>
                    </button>
                  </td>
                  <td className="text-right actions-cell">
                    <div className="action-menu-wrap" ref={isMenuOpen ? menuRef : null}>
                      <button
                        type="button"
                        className="menu-trigger-btn"
                        onClick={() => setActiveMenu(isMenuOpen ? null : skill.name)}
                        aria-expanded={isMenuOpen}
                        aria-label={`Actions for ${skill.name}`}
                      >
                        <MoreVertical size={16} />
                      </button>

                      {isMenuOpen && (
                        <div className="dropdown-menu-popover" role="menu">
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setActiveMenu(null);
                              onViewMatching(skill.name);
                            }}
                          >
                            <Users size={14} />
                            <span>View Matching Candidates</span>
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setActiveMenu(null);
                              onViewMissing(skill.name);
                            }}
                          >
                            <UserX size={14} />
                            <span>View Candidates Missing Skill</span>
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setActiveMenu(null);
                              if (onViewEvidence) {
                                onViewEvidence(skill.name);
                              } else {
                                onViewMatching(skill.name);
                              }
                            }}
                          >
                            <FileCheck size={14} />
                            <span>View Skill Evidence</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
