import { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await signInWithEmailAndPassword(auth, form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '40px auto', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h2>تسجيل الدخول</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleLogin}>
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

        <button type="submit" style={btnStyle}>دخول</button>
      </form>

      <p>ما عندك حساب؟ <a href="/signup">سجّل الآن</a></p>
    </div>
  );
}

// تنسيقات
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

export default LoginPage;
