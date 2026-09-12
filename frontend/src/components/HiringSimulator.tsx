import React, { useState, useMemo } from 'react';
import { Sliders, RotateCcw, ArrowUp, ArrowDown, Minus, ArrowRight, Sparkles, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { simulateHiringWeights } from '../services/api';
import type { Candidate, HiringWeights } from '../types';

interface HiringSimulatorProps {
  isOpen: boolean;
  onClose: () => void;
  baseCandidates: Candidate[];
}

const defaultWeights: HiringWeights = {
  frontend: 50,
  backend: 50,
  cloud: 50,
  experience: 50,
  projects: 50,
  requiredSkills: 50,
};

export function HiringSimulator({ isOpen, onClose, baseCandidates }: HiringSimulatorProps) {
  const navigate = useNavigate();
  const [weights, setWeights] = useState<HiringWeights>(defaultWeights);

  const simulationResult = useMemo(() => {
    return simulateHiringWeights(weights, baseCandidates);
  }, [weights, baseCandidates]);

  const handleSliderChange = (key: keyof HiringWeights, val: number) => {
    setWeights((prev) => ({ ...prev, [key]: val }));
  };

  const handleReset = () => {
    setWeights(defaultWeights);
  };

  if (!isOpen) return null;

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div
        className="drawer-panel simulator-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sim-title"
      >
        <header className="drawer-header">
          <div>
            <div className="drawer-eyebrow">DECISION SUPPORT SIMULATOR</div>
            <h2 id="sim-title" className="drawer-title">
              Hiring Priority Simulator
            </h2>
            <p className="drawer-subtitle">
              Dynamically adjust weightings to test how prioritization shifts candidate rankings.
            </p>
          </div>
          <div className="drawer-header-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleReset}
              title="Reset weights to default"
            >
              <RotateCcw size={13} /> Reset
            </button>
            <button type="button" className="close-btn" onClick={onClose} aria-label="Close panel">
              <X size={20} />
            </button>
          </div>
        </header>

        <div className="simulator-body">
          {/* Sliders Control Panel */}
          <div className="simulator-controls-box">
            <h4>Hiring Priorities</h4>
            <div className="sliders-grid">
              <div className="slider-group">
                <div className="slider-label-row">
                  <span>Frontend Architecture</span>
                  <b>{weights.frontend}%</b>
                </div>
                <input
                  type="range"
                  min="10"
                  max="90"
                  value={weights.frontend}
                  onChange={(e) => handleSliderChange('frontend', Number(e.target.value))}
                />
                <small>Prioritize Angular & React framework depth</small>
              </div>

              <div className="slider-group">
                <div className="slider-label-row">
                  <span>Backend & Database</span>
                  <b>{weights.backend}%</b>
                </div>
                <input
                  type="range"
                  min="10"
                  max="90"
                  value={weights.backend}
                  onChange={(e) => handleSliderChange('backend', Number(e.target.value))}
                />
                <small>Prioritize Python microservices and SQL performance</small>
              </div>

              <div className="slider-group">
                <div className="slider-label-row">
                  <span>Cloud & DevOps</span>
                  <b>{weights.cloud}%</b>
                </div>
                <input
                  type="range"
                  min="10"
                  max="90"
                  value={weights.cloud}
                  onChange={(e) => handleSliderChange('cloud', Number(e.target.value))}
                />
                <small>Prioritize AWS deployment and Docker containers</small>
              </div>

              <div className="slider-group">
                <div className="slider-label-row">
                  <span>Experience Seniority</span>
                  <b>{weights.experience}%</b>
                </div>
                <input
                  type="range"
                  min="10"
                  max="90"
                  value={weights.experience}
                  onChange={(e) => handleSliderChange('experience', Number(e.target.value))}
                />
                <small>Prioritize candidates with 3+ years tenure</small>
              </div>

              <div className="slider-group">
                <div className="slider-label-row">
                  <span>Project Evidence</span>
                  <b>{weights.projects}%</b>
                </div>
                <input
                  type="range"
                  min="10"
                  max="90"
                  value={weights.projects}
                  onChange={(e) => handleSliderChange('projects', Number(e.target.value))}
                />
                <small>Prioritize verified hands-on production repositories</small>
              </div>

              <div className="slider-group">
                <div className="slider-label-row">
                  <span>Required Skills Strictness</span>
                  <b>{weights.requiredSkills}%</b>
                </div>
                <input
                  type="range"
                  min="10"
                  max="90"
                  value={weights.requiredSkills}
                  onChange={(e) => handleSliderChange('requiredSkills', Number(e.target.value))}
                />
                <small>Penalize gaps across 5 mandatory skills</small>
              </div>
            </div>
          </div>

          {/* Dynamic Explanation of Shift */}
          <div className="simulation-explanation-banner">
            <Sparkles size={16} />
            <div>
              <b>Simulation Impact:</b>
              <p>{simulationResult.explanation}</p>
            </div>
          </div>

          {/* Simulated Ranking Table */}
          <div className="simulated-ranking-wrap">
            <div className="sim-table-head">
              <span>RANK</span>
              <span>CANDIDATE</span>
              <span>DELTA</span>
              <span className="text-right">SIMULATED SCORE</span>
              <span className="text-right">ACTION</span>
            </div>

            <div className="sim-candidate-list">
              {simulationResult.candidates.map((c) => {
                const isPositive = c.rankDelta > 0;
                const isNegative = c.rankDelta < 0;

                return (
                  <div key={c.id} className="sim-candidate-row">
                    <div className="sim-rank">#{c.rank}</div>
                    <div className="sim-name-wrap">
                      <b>{c.name}</b>
                      <small>{c.title}</small>
                    </div>
                    <div className="sim-delta">
                      {isPositive && (
                        <span className="delta-badge up">
                          <ArrowUp size={11} /> +{c.rankDelta}
                        </span>
                      )}
                      {isNegative && (
                        <span className="delta-badge down">
                          <ArrowDown size={11} /> {c.rankDelta}
                        </span>
                      )}
                      {!isPositive && !isNegative && (
                        <span className="delta-badge neutral">
                          <Minus size={11} />
                        </span>
                      )}
                    </div>
                    <div className="sim-score text-right">
                      <b>{c.finalScore.toFixed(1)}%</b>
                    </div>
                    <div className="text-right">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          onClose();
                          navigate(`/candidate/${c.id}`);
                        }}
                      >
                        View <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
