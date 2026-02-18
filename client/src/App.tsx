import { useState, useEffect } from 'react'
import { Plus, Trophy, Flame, MessageSquare, CheckCircle2, Target, LogIn, LogOut, Trash2, Shield } from 'lucide-react'
import { useGoogleLogin, googleLogout, GoogleLogin } from '@react-oauth/google'
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

interface User {
    id: string;
    name: string;
    email: string;
    picture: string;
    role: 'user' | 'admin';
}

const API_BASE_URL = (import.meta as any).env.VITE_API_URL || '';

function App() {
    const [user, setUser] = useState<User | null>(null);
    const [isGuest, setIsGuest] = useState(localStorage.getItem('isGuest') === 'true');
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [goals, setGoals] = useState<Goal[]>([]);
    const [thoughts, setThoughts] = useState<Thought[]>([]);
    const [heatmapData, setHeatmapData] = useState<Record<string, number>>({});
    const [newThought, setNewThought] = useState('');
    const [showAddGoal, setShowAddGoal] = useState(false);
    const [newGoal, setNewGoal] = useState({ name: '', target: 10, color: '#00d2ff' });
    const [loading, setLoading] = useState(true);
    const [isAdminView, setIsAdminView] = useState(false);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [selectedUserProgress, setSelectedUserProgress] = useState<any>(null);

    useEffect(() => {
        if (token) {
            fetchUser();
        } else if (isGuest) {
            setUser({ id: 'guest', name: 'Guest User', email: '', picture: '', role: 'user' });
            setLoading(false);
        } else {
            setLoading(false);
        }
    }, [token, isGuest]);

    useEffect(() => {
        if (user) {
            fetchGoals();
            fetchThoughts();
            fetchHeatmap();
        }
    }, [user]);

    const fetchUser = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUser(data);
            } else {
                handleLogout();
            }
        } catch (err) {
            console.error('Failed to fetch user', err);
        } finally {
            setLoading(false);
        }
    };

    const handleLoginSuccess = (response: any) => {
        const idToken = response.credential;
        localStorage.setItem('token', idToken);
        localStorage.removeItem('isGuest');
        setToken(idToken);
        setIsGuest(false);
    };

    const handleGuestLogin = () => {
        localStorage.setItem('isGuest', 'true');
        setIsGuest(true);
        setUser({ id: 'guest', name: 'Guest User', email: '', picture: '', role: 'user' });
    };

    const handleLogout = () => {
        googleLogout();
        localStorage.removeItem('token');
        localStorage.removeItem('isGuest');
        setToken(null);
        setIsGuest(false);
        setUser(null);
        setGoals([]);
        setThoughts([]);
        setHeatmapData({});
        setIsAdminView(false);
    };

    const fetchAllUsers = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setAllUsers(data);
        } catch (err) {
            console.error('Failed to fetch users', err);
        }
    };

    const fetchUserProgress = async (userId: string) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/user/${userId}/progress`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setSelectedUserProgress(data);
        } catch (err) {
            console.error('Failed to fetch user progress', err);
        }
    };

    const fetchGoals = async () => {
        if (isGuest) {
            const saved = localStorage.getItem('guest_goals');
            setGoals(saved ? JSON.parse(saved) : []);
            return;
        }
        try {
            const res = await fetch(`${API_BASE_URL}/api/goals`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setGoals(data);
        } catch (err) {
            console.error('Failed to fetch goals', err);
        }
    };

    const fetchHeatmap = async () => {
        if (isGuest) {
            const saved = localStorage.getItem('guest_heatmap');
            setHeatmapData(saved ? JSON.parse(saved) : {});
            return;
        }
        try {
            const res = await fetch(`${API_BASE_URL}/api/stats/heatmap`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
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
        if (isGuest) {
            const saved = localStorage.getItem('guest_thoughts');
            setThoughts(saved ? JSON.parse(saved) : []);
            return;
        }
        try {
            const res = await fetch(`${API_BASE_URL}/api/thoughts`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setThoughts(data);
        } catch (err) {
            console.error('Failed to fetch thoughts', err);
        }
    };

    const addGoal = async () => {
        if (!newGoal.name) return;
        if (isGuest) {
            const id = Math.random().toString(36).substr(2, 9);
            const goal = { ...newGoal, id, current: 0 };
            const updated = [...goals, goal];
            setGoals(updated as any);
            localStorage.setItem('guest_goals', JSON.stringify(updated));
            setShowAddGoal(false);
            setNewGoal({ name: '', target: 10, color: '#00d2ff' });
            return;
        }
        try {
            await fetch(`${API_BASE_URL}/api/goals`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
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

    const deleteGoal = async (id: string | number) => {
        if (isGuest) {
            const updated = goals.filter(g => g.id !== id);
            setGoals(updated);
            localStorage.setItem('guest_goals', JSON.stringify(updated));
            // Also cleanup heatmap if needed, but for guest we leave it
            return;
        }
        try {
            await fetch(`${API_BASE_URL}/api/goals/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchGoals();
            fetchHeatmap();
        } catch (err) {
            console.error('Failed to delete goal', err);
        }
    };

    const updateProgress = async (goalId: string | number) => {
        if (isGuest) {
            const updatedGoals = goals.map(g => g.id === goalId ? { ...g, current: g.current + 1 } : g);
            setGoals(updatedGoals);
            localStorage.setItem('guest_goals', JSON.stringify(updatedGoals));

            const date = new Date().toISOString().split('T')[0];
            const updatedHeatmap = { ...heatmapData, [date]: (heatmapData[date] || 0) + 1 };
            setHeatmapData(updatedHeatmap);
            localStorage.setItem('guest_heatmap', JSON.stringify(updatedHeatmap));
            return;
        }
        try {
            await fetch(`${API_BASE_URL}/api/goals/${goalId}/track`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchGoals();
            fetchHeatmap();
        } catch (err) {
            console.error('Failed to track goal', err);
        }
    };

    const addThought = async () => {
        if (!newThought.trim()) return;
        if (isGuest) {
            const id = Math.random().toString(36).substr(2, 9);
            const thought = { id, text: newThought, date: new Date().toISOString() };
            const updated = [thought, ...thoughts];
            setThoughts(updated as any);
            localStorage.setItem('guest_thoughts', JSON.stringify(updated));
            setNewThought('');
            return;
        }
        try {
            await fetch(`${API_BASE_URL}/api/thoughts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ text: newThought })
            });
            setNewThought('');
            fetchThoughts();
        } catch (err) {
            console.error('Failed to add thought', err);
        }
    };

    const deleteThought = async (id: string | number) => {
        if (isGuest) {
            const updated = thoughts.filter(t => t.id !== id);
            setThoughts(updated);
            localStorage.setItem('guest_thoughts', JSON.stringify(updated));
            return;
        }
        try {
            await fetch(`${API_BASE_URL}/api/thoughts/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchThoughts();
        } catch (err) {
            console.error('Failed to delete thought', err);
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

    if (loading) return <div className="loading-screen">Deepening...</div>;

    if (!user) {
        return (
            <div className="login-screen">
                <div className="glass-panel login-card">
                    <h1>Elite Dashboard</h1>
                    <p>Unlock your personalized progress tracking.</p>
                    <div className="login-actions">
                        <GoogleLogin
                            onSuccess={handleLoginSuccess}
                            onError={() => console.log('Login Failed')}
                        />
                        <div className="divider">or</div>
                        <button className="guest-btn" onClick={handleGuestLogin}>
                            Continue as Guest
                        </button>
                    </div>
                </div>
            </div>
        );
    }

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
                <div className="header-left">
                    <h1>Elite Dashboard</h1>
                    {user.role === 'admin' && (
                        <button
                            className={`admin-badge-btn ${isAdminView ? 'active' : ''}`}
                            onClick={() => {
                                setIsAdminView(!isAdminView);
                                if (!isAdminView) fetchAllUsers();
                            }}
                        >
                            <Shield size={14} /> {isAdminView ? 'Back to My Progress' : 'Admin Panel'}
                        </button>
                    )}
                </div>
                <div className="header-stats">
                    <div className="stat-pill"><Flame size={16} /> Activity Streak</div>
                    <div className="stat-pill"><Trophy size={16} /> Achievements</div>
                    <div className="user-profile">
                        {user.picture ? (
                            <img src={user.picture} alt={user.name} className="user-avatar" title={user.name} />
                        ) : (
                            <div className="user-avatar guest-avatar" title="Guest User">G</div>
                        )}
                        <button className="icon-btn logout-btn" onClick={handleLogout} title="Sign Out">
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="dashboard-grid">
                {isAdminView ? (
                    <section className="glass-panel admin-section">
                        <div className="panel-header">
                            <h2><Shield size={20} /> User Management</h2>
                        </div>
                        <div className="admin-content">
                            <div className="users-list">
                                {allUsers.map(u => (
                                    <div key={u.id} className="user-list-item" onClick={() => fetchUserProgress(u.id)}>
                                        <img src={u.picture} alt={u.name} className="user-avatar-small" />
                                        <div className="user-list-info">
                                            <span className="user-list-name">{u.name}</span>
                                            <span className="user-list-email">{u.email}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="user-detail-view">
                                {selectedUserProgress ? (
                                    <div className="progress-details">
                                        <h3>Progress for {allUsers.find(u => u.id === selectedUserProgress.goals[0]?.userId || u.id === selectedUserProgress.thoughts[0]?.userId)?.name || 'User'}</h3>
                                        <div className="detail-stat">
                                            <span>Goals: {selectedUserProgress.goals.length}</span>
                                            <span>Thoughts: {selectedUserProgress.thoughts.length}</span>
                                        </div>
                                        <div className="detail-lists">
                                            <div className="detail-goals">
                                                <h4>Goals</h4>
                                                {selectedUserProgress.goals.map((g: any) => (
                                                    <div key={g.id} className="detail-item">
                                                        <span>{g.name} ({g.current}/{g.target})</span>
                                                        <button className="delete-btn" onClick={() => deleteGoal(g.id).then(() => fetchUserProgress(g.userId))}>
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="detail-thoughts">
                                                <h4>Thoughts</h4>
                                                {selectedUserProgress.thoughts.map((t: any) => (
                                                    <div key={t.id} className="detail-item">
                                                        <p>{t.text}</p>
                                                        <button className="delete-btn" onClick={() => deleteThought(t.id).then(() => fetchUserProgress(t.userId))}>
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="empty-msg">Select a user to view their progress</p>
                                )}
                            </div>
                        </div>
                    </section>
                ) : (
                    <>
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
                                        >
                                            <div className="goal-info" onClick={() => updateProgress(goal.id)}>
                                                <h3>{goal.name}</h3>
                                                <div className="progress-ring">
                                                    <svg viewBox="0 0 36 36" className="circular-chart">
                                                        <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                                        <path className="circle" strokeDasharray={`${Math.min(100, (goal.current / goal.target) * 100)}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" style={{ stroke: goal.color }} />
                                                    </svg>
                                                </div>
                                            </div>
                                            <div className="goal-actions">
                                                <div className="progress-bar">
                                                    <div
                                                        className="progress-fill"
                                                        style={{
                                                            width: `${Math.min(100, (goal.current / goal.target) * 100)}%`,
                                                            background: `linear-gradient(90deg, ${goal.color}, white)`
                                                        }}
                                                    />
                                                </div>
                                                <button className="delete-btn" onClick={(e) => { e.stopPropagation(); deleteGoal(goal.id); }}>
                                                    <Trash2 size={16} />
                                                </button>
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
                                        <div className="thought-content">
                                            <p>{thought.text}</p>
                                            <span className="thought-date">{new Date(thought.date).toLocaleDateString()}</span>
                                        </div>
                                        <button className="delete-btn" onClick={() => deleteThought(thought.id)}>
                                            <Trash2 size={14} />
                                        </button>
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
                    </>
                )}
            </main>
        </div>
    )
}

export default App
