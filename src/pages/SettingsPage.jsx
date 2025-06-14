import { useEffect, useState } from 'react';
import { db, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

function SettingsPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState(null);
  const [goal, setGoal] = useState('');
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');

  useEffect(() => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setGoal(data.goal || '');
          setCategories(data.categories || []);
        }
      } else {
        navigate('/');
      }
    });
  }, []);

  const handleAddCategory = () => {
    if (newCategory && !categories.includes(newCategory)) {
      setCategories([...categories, newCategory]);
      setNewCategory('');
    }
  };

  const handleDeleteCategory = (cat) => {
    setCategories(categories.filter(c => c !== cat));
  };

  const handleSave = async () => {
    if (!userId) return;
    await setDoc(doc(db, "users", userId), {
      goal,
      categories
    }, { merge: true });
    alert("✅ تم حفظ الإعدادات بنجاح!");
  };

  return (
    <div style={containerStyle}>
      <h2>🛠️ إعداداتك المالية</h2>

      <div>
        <label>🎯 هدفك المالي:</label><br />
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="مثال: أبغى أوفر 3000 خلال 3 شهور"
          style={textareaStyle}
        ></textarea>
      </div>

      <div style={{ marginTop: '20px' }}>
        <label>🏷️ تصنيفاتك المالية:</label><br />
        <ul>
          {categories.map((cat, i) => (
            <li key={i} style={listItemStyle}>
              {cat}
              <button onClick={() => handleDeleteCategory(cat)} style={deleteBtn}>حذف</button>
            </li>
          ))}
        </ul>

        <input
          type="text"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="أضف تصنيف جديد"
          style={inputStyle}
        />
        <button onClick={handleAddCategory} style={btnStyle}>➕ إضافة</button>
      </div>

      <button onClick={handleSave} style={{ ...btnStyle, marginTop: '30px' }}>💾 حفظ الإعدادات</button>

      <button onClick={() => navigate('/dashboard')} style={{ ...btnStyle, backgroundColor: '#2ecc71', marginTop: '10px' }}>
        🔙 رجوع إلى لوحة التحكم
      </button>
    </div>
  );
}

// ✅ التنسيقات
const containerStyle = {
  maxWidth: '600px',
  margin: '40px auto',
  padding: '20px',
  background: '#fff',
  borderRadius: '12px',
  boxShadow: '0 0 10px rgba(0,0,0,0.1)',
  direction: 'rtl',
  fontFamily: 'sans-serif'
};

const textareaStyle = {
  width: '100%',
  minHeight: '80px',
  padding: '10px',
  borderRadius: '8px',
  border: '1px solid #ccc',
  marginTop: '5px'
};

const inputStyle = {
  padding: '8px',
  borderRadius: '6px',
  border: '1px solid #ccc',
  marginTop: '10px',
  marginRight: '5px'
};

const btnStyle = {
  padding: '8px 14px',
  borderRadius: '6px',
  backgroundColor: '#3498db',
  color: 'white',
  border: 'none',
  marginRight: '8px',
  cursor: 'pointer'
};

const deleteBtn = {
  marginRight: '10px',
  backgroundColor: '#e74c3c',
  color: 'white',
  border: 'none',
  padding: '5px 10px',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '12px'
};

const listItemStyle = {
  marginBottom: '6px'
};

export default SettingsPage;
