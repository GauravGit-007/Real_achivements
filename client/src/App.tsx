import { useState, useEffect } from 'react'
import { Plus, Trophy, Flame, MessageSquare, CheckCircle2, Target } from 'lucide-react'
import './App.css'

interface Goal {
    id: string | number;
    name: string;
    target: number;
    current: number;
    color: string;
}

interface Thought {
    id: string | number;
    text: string;
    date: string;
}

function App() {
    const [goals, setGoals] = useState<Goal[]>([]);
    const [thoughts, setThoughts] = useState<Thought[]>([]);
    const [heatmapData, setHeatmapData] = useState<Record<string, number>>({});
    const [newThought, setNewThought] = useState('');
    const [showAddGoal, setShowAddGoal] = useState(false);
    const [newGoal, setNewGoal] = useState({ name: '', target: 10, color: '#00d2ff' });

    useEffect(() => {
        fetchGoals();
        fetchThoughts();
        fetchHeatmap();
    }, []);

    const fetchGoals = async () => {
        try {
            const res = await fetch('/api/goals');
            const data = await res.json();
            setGoals(data);
        } catch (err) {
            console.error('Failed to fetch goals', err);
        }
    };

    const fetchHeatmap = async () => {
        try {
            const res = await fetch('/api/stats/heatmap');
            const data = await res.json();
            const mapped = data.reduce((acc: any, curr: any) => {
                acc[curr.date] = curr.count;
                return acc;
            }, {});
            setHeatmapData(mapped);
        } catch (err) {
            console.error('Failed to fetch heatmap', err);
        }
    };

    const fetchThoughts = async () => {
        try {
            const res = await fetch('/api/thoughts');
            const data = await res.json();
            setThoughts(data);
        } catch (err) {
            console.error('Failed to fetch thoughts', err);
        }
    };

    const addGoal = async () => {
        if (!newGoal.name) return;
        try {
            await fetch('/api/goals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newGoal)
            });
            setShowAddGoal(false);
            setNewGoal({ name: '', target: 10, color: '#00d2ff' });
            fetchGoals();
            fetchHeatmap();
        } catch (err) {
            console.error('Failed to add goal', err);
        }
    };

    const updateProgress = async (goalId: string | number) => {
        try {
            await fetch(`/api/goals/${goalId}/track`, { method: 'POST' });
            fetchGoals();
            fetchHeatmap();
        } catch (err) {
            console.error('Failed to track goal', err);
        }
    };

    const addThought = async () => {
        if (!newThought.trim()) return;
        try {
            await fetch('/api/thoughts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: newThought })
            });
            setNewThought('');
            fetchThoughts();
        } catch (err) {
            console.error('Failed to add thought', err);
        }
    };

    const getHeatmapColor = (dateStr: string) => {
        const count = heatmapData[dateStr] || 0;
        if (count === 0) return 'val-0';
        if (count < 2) return 'val-1';
        if (count < 4) return 'val-2';
        if (count < 6) return 'val-3';
        return 'val-4';
    };

    return (
        <div className="app-layout">
            {showAddGoal && (
                <div className="modal-overlay">
                    <div className="glass-panel modal-content">
                        <h3><Target size={20} /> Add New Goal</h3>
                        <input
                            placeholder="Goal Name"
                            className="glass-input"
                            value={newGoal.name}
                            onChange={e => setNewGoal({ ...newGoal, name: e.target.value })}
                        />
                        <div className="input-group">
                            <label>Target Count</label>
                            <input
                                type="number"
                                className="glass-input"
                                value={newGoal.target}
                                onChange={e => setNewGoal({ ...newGoal, target: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="color-picker">
                            {['#00d2ff', '#a29bfe', '#ff7675', '#55efc4', '#fdcb6e'].map(c => (
                                <div
                                    key={c}
                                    className={`color-swatch ${newGoal.color === c ? 'active' : ''}`}
                                    style={{ background: c }}
                                    onClick={() => setNewGoal({ ...newGoal, color: c })}
                                />
                            ))}
                        </div>
                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={() => setShowAddGoal(false)}>Cancel</button>
                            <button onClick={addGoal} className="submit-btn" disabled={!newGoal.name}>Create Goal</button>
                        </div>
                    </div>
                </div>
            )}

            <header className="header">
                <h1>Elite Dashboard</h1>
                <div className="header-stats">
                    <div className="stat-pill"><Flame size={16} /> Activity Streak</div>
                    <div className="stat-pill"><Trophy size={16} /> Achievements</div>
                </div>
            </header>

            <main className="dashboard-grid">
                <section className="glass-panel goals-section">
                    <div className="panel-header">
                        <h2><CheckCircle2 size={20} /> Active Goals</h2>
                        <button className="icon-btn" onClick={() => setShowAddGoal(true)}><Plus size={20} /></button>
                    </div>
                    <div className="goals-grid">
                        {goals.length === 0 ? (
                            <p className="empty-msg">No goals yet. Start small!</p>
                        ) : (
                            goals.map(goal => (
                                <div
                                    key={goal.id}
                                    className="goal-card"
                                    style={{ '--accent': goal.color } as any}
                                    onClick={() => updateProgress(goal.id)}
                                >
                                    <div className="goal-info">
                                        <h3>{goal.name}</h3>
                                        <div className="progress-ring">
                                            <svg viewBox="0 0 36 36" className="circular-chart">
                                                <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                                <path className="circle" strokeDasharray={`${Math.min(100, (goal.current / goal.target) * 100)}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" style={{ stroke: goal.color }} />
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="progress-bar">
                                        <div
                                            className="progress-fill"
                                            style={{
                                                width: `${Math.min(100, (goal.current / goal.target) * 100)}%`,
                                                background: `linear-gradient(90deg, ${goal.color}, white)`
                                            }}
                                        />
                                    </div>
                                    <span className="progress-text">Progress: {goal.current} / {goal.target}</span>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                <section className="glass-panel thoughts-section">
                    <div className="panel-header">
                        <h2><MessageSquare size={20} /> Daily Thoughts</h2>
                    </div>
                    <div className="thought-input-group">
                        <textarea
                            placeholder="What's on your mind today?"
                            value={newThought}
                            onChange={(e) => setNewThought(e.target.value)}
                        />
                        <button onClick={addThought} className="submit-btn" disabled={!newThought.trim()}>Deepen</button>
                    </div>
                    <div className="thoughts-list">
                        {thoughts.map(thought => (
                            <div key={thought.id} className="thought-item">
                                <p>{thought.text}</p>
                                <span className="thought-date">{new Date(thought.date).toLocaleDateString()}</span>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="glass-panel heatmap-section">
                    <div className="panel-header">
                        <h2>Activity Heatmap</h2>
                    </div>
                    <div className="heatmap-container">
                        <div className="grid-viz">
                            {Array.from({ length: 52 * 7 }).map((_, i) => {
                                const date = new Date();
                                date.setDate(date.getDate() - (52 * 7 - 1 - i));
                                const dateStr = date.toISOString().split('T')[0];
                                return (
                                    <div
                                        key={i}
                                        className={`cell ${getHeatmapColor(dateStr)}`}
                                        title={`${dateStr}: ${heatmapData[dateStr] || 0} activities`}
                                    />
                                );
                            })}
                        </div>
                        <div className="heatmap-legend">
                            <span>Less</span>
                            <div className="cell val-0"></div>
                            <div className="cell val-1"></div>
                            <div className="cell val-2"></div>
                            <div className="cell val-3"></div>
                            <div className="cell val-4"></div>
                            <span>More</span>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    )
}

export default App
