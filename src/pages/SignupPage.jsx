import { useState } from 'react';
import { auth, db } from '../firebase';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );

      const user = userCredential.user;

      // حفظ الاسم في Firestore
      await setDoc(doc(db, "users", user.uid), {
        name: form.name,
        email: form.email
      });

      // إرسال رابط التحقق
      await sendEmailVerification(user);

      alert("✅ تم إنشاء الحساب! تم إرسال رابط التحقق إلى بريدك الإلكتروني.");
      navigate('/dashboard');

    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '40px auto', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h2>تسجيل حساب جديد</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSignup}>

        <input
          type="text"
          name="name"
          placeholder="الاسم الكامل"
          value={form.name}
          onChange={handleChange}
          required
          style={inputStyle}
        /><br /><br />

        <input
          type="email"
          name="email"
          placeholder="البريد الإلكتروني"
          value={form.email}
          onChange={handleChange}
          required
          style={inputStyle}
        /><br /><br />

        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="كلمة المرور"
            value={form.password}
            onChange={handleChange}
            required
            style={{ ...inputStyle, paddingRight: '40px' }}
          />
          <span
            onClick={() => setShowPassword(prev => !prev)}
            style={{
              position: 'absolute',
              right: '25px',
              top: '50%',
              transform: 'translateY(-50%)',
              cursor: 'pointer',
              fontSize: '18px',
              color: '#555'
            }}
          >
            {showPassword ? '👁️‍🗨️' : '👁️'}
          </span>
        </div>
        <br />

        <button type="submit" style={btnStyle}>تسجيل</button>
      </form>

      <p>عندك حساب؟ <a href="/">سجّل دخول</a></p>
    </div>
  );
}

// ✅ تنسيقات
const inputStyle = {
  width: '90%',
  padding: '10px',
  borderRadius: '8px',
  border: '1px solid #ccc'
};

const btnStyle = {
  backgroundColor: '#3498db',
  color: '#fff',
  padding: '10px 20px',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer'
};

export default SignupPage;
