// نفس الاستيرادات تمامًا
import { useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import {
  collection, addDoc, getDocs, query, where, doc, getDoc
} from 'firebase/firestore';
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer
} from 'recharts';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState("");
  const [userGoal, setUserGoal] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [userCategories, setUserCategories] = useState([]);
  const [form, setForm] = useState({ type: 'مصروف', amount: '', category: '', note: '' });
  const [filterType, setFilterType] = useState("all");
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [balance, setBalance] = useState(0);
  const [chartData, setChartData] = useState([]);
  const [barChartData, setBarChartData] = useState([]);
  const [aiAdvice, setAiAdvice] = useState("");
  const [showAdvice, setShowAdvice] = useState(false);

  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);

  const responsiveStyles = `
    @media (max-width: 600px) {
      .chart-container {
        width: 100% !important;
        height: auto !important;
      }
      .chat-widget {
        width: 95% !important;
        left: 2.5% !important;
        bottom: 80px !important;
      }
      .chat-toggle {
        bottom: 20px !important;
        left: 20px !important;
      }
      .filter-buttons {
        flex-direction: column;
        gap: 6px;
      }
      .transaction-form input,
      .transaction-form select,
      .transaction-form button {
        width: 100% !important;
      }
    }
  `;

  useEffect(() => {
    const styleTag = document.createElement("style");
    styleTag.innerHTML = responsiveStyles;
    document.head.appendChild(styleTag);
    return () => document.head.removeChild(styleTag);
  }, []);

  useEffect(() => {
    onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserName(data.name);
          setUserCategories(data.categories || []);
          setUserGoal(data.goal || "");
        }
        fetchTransactions(currentUser.uid);
      } else {
        navigate('/');
      }
    });
  }, []);

  const handleLogout = () => signOut(auth).then(() => navigate('/'));

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!user) return;

    const newTransaction = {
      ...form,
      amount: Number(form.amount),
      date: new Date(),
      userId: user.uid
    };

    await addDoc(collection(db, 'transactions'), newTransaction);
    setForm({ type: 'مصروف', amount: '', category: '', note: '' });
    fetchTransactions(user.uid);
    fetchAdviceForSingleTransaction(newTransaction);
  };

  const fetchTransactions = async (uid) => {
    const q = query(collection(db, 'transactions'), where('userId', '==', uid));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setTransactions(data);

    let income = 0, expense = 0;
    const expenseByCategory = {};
    const monthlyData = {};

    data.forEach((txn) => {
      const amount = Number(txn.amount);
      if (txn.type === "دخل") income += amount;
      else {
        expense += amount;
        expenseByCategory[txn.category] = (expenseByCategory[txn.category] || 0) + amount;
      }

      const date = new Date(txn.date.seconds * 1000);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[key]) monthlyData[key] = { month: key, دخل: 0, مصروف: 0 };
      monthlyData[key][txn.type] += amount;
    });

    setTotalIncome(income);
    setTotalExpense(expense);
    setBalance(income - expense);
    setChartData(Object.entries(expenseByCategory).map(([name, value]) => ({ name, value })));
    setBarChartData(Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month)));
  };

  async function fetchAdviceForSingleTransaction(newTxn) {
    const all = [...transactions, newTxn];
    const formatted = all.map(txn =>
      `${txn.type}: ${txn.amount} ريال على ${txn.category} (${txn.note || "بدون ملاحظة"})`
    ).join("\n");

    const prompt = `
الهدف المالي: "${userGoal}"

تمت إضافة عملية جديدة:
- ${newTxn.type} بمبلغ ${newTxn.amount} ريال على ${newTxn.category} (${newTxn.note || "بدون ملاحظة"})

العمليات السابقة:
${formatted}

اعطه نصيحة سريعة بناءً على هدفه وسلوكه المالي.
`;

    try {
      const res = await fetch("https://dabarah-2c4b36f62364.herokuapp.com/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });
      const data = await res.json();
      if (data.advice) {
        setAiAdvice(data.advice);
        setShowAdvice(true);
      }
    } catch (err) {
      console.error("GPT Error:", err.message);
    }
  }

  const sendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const newMessages = [...chatMessages, { role: "user", content: chatInput }];
    setChatMessages(newMessages);
    setIsChatLoading(true);

    try {
      const res = await fetch("https://dabarah-2c4b36f62364.herokuapp.com/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `
الهدف المالي: ${userGoal}
العمليات:
${transactions.map(txn => `${txn.type} - ${txn.amount} ريال - ${txn.category} (${txn.note || "بدون ملاحظة"})`).join("\n")}

سؤال المستخدم:
${chatInput}
          `
        })
      });

      const data = await res.json();
      if (data.advice) {
        setChatMessages(prev => [...prev, { role: "assistant", content: data.advice }]);
      }
    } catch {
      setChatMessages(prev => [...prev, { role: "assistant", content: "❌ خطأ أثناء الاتصال بالذكاء." }]);
    } finally {
      setChatInput("");
      setIsChatLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      <h2>مرحبًا، {userName || '...'}</h2>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button onClick={handleLogout} style={logoutBtn}>تسجيل الخروج</button>
        <button onClick={() => navigate('/settings')} style={settingsBtn}>⚙️ الإعدادات</button>
      </div>

      <p>💰 الرصيد: {balance} ريال | 📈 دخل: {totalIncome} | 📉 مصروف: {totalExpense}</p>

      <div className="filter-buttons" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        {["all", "دخل", "مصروف"].map(type => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: filterType === type ? '2px solid #2980b9' : '1px solid #ccc',
              backgroundColor: filterType === type ? '#2980b9' : '#fff',
              color: filterType === type ? '#fff' : '#000'
            }}
          >
            {type === "all" ? "عرض الكل" : type}
          </button>
        ))}
      </div>

      <h3>توزيع المصروف</h3>
      <ResponsiveContainer width="100%" height={300} className="chart-container">
        <PieChart>
          <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={`hsl(${index * 50}, 70%, 60%)`} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>

      <h3>مقارنة شهرية</h3>
      <ResponsiveContainer width="100%" height={300} className="chart-container">
        <BarChart data={barChartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="دخل" fill="#2ecc71" />
          <Bar dataKey="مصروف" fill="#e74c3c" />
        </BarChart>
      </ResponsiveContainer>

      <h3>إضافة عملية</h3>
      <form onSubmit={handleAdd} className="transaction-form">
        <select name="type" value={form.type} onChange={handleChange} style={inputStyle}>
          <option value="مصروف">مصروف</option>
          <option value="دخل">دخل</option>
        </select><br /><br />
        <input type="number" name="amount" value={form.amount} onChange={handleChange} placeholder="المبلغ" style={inputStyle} required /><br /><br />
        <select name="category" value={form.category} onChange={handleChange} style={inputStyle}>
          <option>اختر تصنيف</option>
          {userCategories.map((cat, i) => <option key={i} value={cat}>{cat}</option>)}
        </select><br /><br />
        <input type="text" name="note" value={form.note} onChange={handleChange} placeholder="ملاحظة" style={inputStyle} /><br /><br />
        <button type="submit" style={btnStyle}>إضافة</button>
      </form>

      <h3>العمليات</h3>
      <ul>
        {transactions
          .filter(txn => filterType === "all" || txn.type === filterType)
          .map(txn => (
            <li key={txn.id} style={cardStyle}>
              <strong>{txn.type}</strong> - {txn.amount} ريال - {txn.category}
              <br /><small>{txn.note}</small>
            </li>
          ))}
      </ul>

      {showAdvice && (
        <div style={popupStyle}>
          <strong>💡 نصيحة:</strong>
          <p>{aiAdvice}</p>
          <button onClick={() => setShowAdvice(false)} style={closeBtn}>×</button>
        </div>
      )}

      <div className="chat-toggle" style={chatToggleButton} onClick={() => setShowChat(prev => !prev)}>💬</div>
      {showChat && (
        <div className="chat-widget" style={chatWidget}>
          <strong>محادثة AI</strong>
          <div style={{ maxHeight: 150, overflowY: 'auto', margin: '10px 0' }}>
            {chatMessages.map((msg, idx) => (
              <p key={idx}><strong>{msg.role === "user" ? "أنت" : "AI"}:</strong> {msg.content}</p>
            ))}
            {isChatLoading && <p>⏳ جاري التفكير...</p>}
          </div>
          <form onSubmit={sendChatMessage} style={{ display: 'flex' }}>
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="سؤالك..."
              style={{ flex: 1 }}
            />
            <button type="submit" style={btnStyle}>إرسال</button>
          </form>
        </div>
      )}
    </div>
  );
}

// التنسيقات
const containerStyle = { padding: '20px', fontFamily: 'sans-serif', direction: 'rtl' };
const inputStyle = { width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #ccc' };
const btnStyle = { backgroundColor: '#3498db', color: 'white', padding: '10px', borderRadius: '6px', border: 'none' };
const logoutBtn = { ...btnStyle, backgroundColor: '#e74c3c' };
const settingsBtn = { ...btnStyle, backgroundColor: '#2ecc71' };
const cardStyle = { background: '#fff', padding: '10px', margin: '10px 0', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' };
const popupStyle = { background: '#2ecc71', color: '#fff', padding: '10px', borderRadius: '10px', position: 'fixed', bottom: '30px', right: '30px', zIndex: 9999 };
const closeBtn = { background: 'transparent', border: 'none', color: '#fff', fontSize: '18px', cursor: 'pointer' };
const chatToggleButton = { position: 'fixed', bottom: '30px', left: '30px', width: '50px', height: '50px', background: '#2980b9', borderRadius: '50%', color: '#fff', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 9999 };
const chatWidget = { position: 'fixed', bottom: '100px', left: '30px', background: '#f8f8f8', padding: '10px', width: '300px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', zIndex: 10000 };

export default Dashboard;
