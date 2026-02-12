import axios from 'axios';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const BASE_URL = "http://192.168.0.4:3000";

const SupportLoginScreen = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Please enter username and password');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${BASE_URL}/api/support/login`, {
        username: username.trim(),
        password: password.trim(),
      });

      if (response.data.success) {
        localStorage.setItem('supportId', response.data.user.id.toString());
        localStorage.setItem('supportUsername', response.data.user.username);
        localStorage.setItem('role', 'support');
        navigate('/support/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
      if (error.response) {
        setError(error.response.data.error || 'Login failed');
      } else {
        setError('Network error. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <style>{keyframes}</style>
      
      <div className="support-card" style={styles.card}>
        <div style={styles.header}>
          <div style={styles.iconContainer}>
            <span style={styles.icon}>🎧</span>
          </div>
          <h1 style={styles.headerTitle}>Admin Login</h1>
          <p style={styles.headerSubtitle}>Access your dashboard</p>
        </div>

        <form style={styles.form} onSubmit={handleLogin}>
          {error && (
            <div className="error-shake" style={styles.errorMessage}>
              <span style={styles.errorIcon}>⚠️</span>
              <p style={styles.errorText}>{error}</p>
            </div>
          )}

          <div style={styles.inputWrapper}>
            <label style={styles.label}>Username</label>
            <div className="input-focus" style={styles.inputContainer}>
              <span style={styles.inputIcon}>👤</span>
              <input
                type="text"
                style={styles.input}
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div style={styles.inputWrapper}>
            <label style={styles.label}>Password</label>
            <div className="input-focus" style={styles.inputContainer}>
              <span style={styles.inputIcon}>🔒</span>
              <input
                type={showPassword ? 'text' : 'password'}
                style={styles.input}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                className="eye-hover"
                style={styles.eyeIcon}
                onClick={() => setShowPassword(!showPassword)}
              >
                <span style={styles.eyeIconText}>{showPassword ? '👁️' : '👁️‍🗨️'}</span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            className={`login-btn ${loading ? 'disabled' : ''}`}
            style={{
              ...styles.loginButton,
              ...(loading && styles.loginButtonDisabled)
            }}
            disabled={loading}
          >
            {loading ? (
              <span className="spinner" style={styles.spinner}></span>
            ) : (
              'Login'
            )}
          </button>

          <button
            type="button"
            className="back-hover"
            style={styles.backButton}
            onClick={() => navigate('/')}
            disabled={loading}
          >
            ← Back to main
          </button>
        </form>
      </div>
    </div>
  );
};

const keyframes = `
  * {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  
  *::-webkit-scrollbar {
    display: none;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-10px); }
    75% { transform: translateX(10px); }
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .support-card {
    animation: slideUp 0.5s ease-out;
  }

  .error-shake {
    animation: shake 0.4s ease;
  }

  .spinner {
    animation: spin 0.8s linear infinite;
  }

  .login-btn:hover:not(.disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.5);
  }

  .login-btn:active:not(.disabled) {
    transform: translateY(0);
  }

  .eye-hover:hover {
    transform: scale(1.1);
  }

  .back-hover:hover:not(:disabled) {
    color: #764ba2;
  }

  .input-focus:focus-within {
    border-color: #667eea;
    box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
  }

  @media (max-width: 480px) {
    .support-card {
      border-radius: 0;
      min-height: 100vh;
    }
  }
`;

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '15px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    overflow: 'hidden',
  },
  card: {
    width: '100%',
    maxWidth: '380px',
    background: '#fff',
    borderRadius: '20px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    overflow: 'hidden',
  },
  header: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '40px 20px 35px',
    textAlign: 'center',
    color: '#fff',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
  },
  iconContainer: {
    width: '70px',
    height: '70px',
    margin: '0 auto 15px',
    background: 'rgba(255, 255, 255, 0.25)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '3px solid rgba(255, 255, 255, 0.3)',
  },
  icon: {
    fontSize: '35px',
  },
  headerTitle: {
    fontSize: '26px',
    fontWeight: '800',
    margin: '0 0 8px 0',
    letterSpacing: '0.5px',
  },
  headerSubtitle: {
    fontSize: '14px',
    margin: '0',
    opacity: '0.95',
    fontWeight: '500',
  },
  form: {
    padding: '25px 20px',
  },
  errorMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 14px',
    background: '#fee',
    border: '1px solid #fcc',
    borderRadius: '10px',
    marginBottom: '18px',
  },
  errorIcon: {
    fontSize: '18px',
  },
  errorText: {
    margin: '0',
    color: '#c33',
    fontSize: '13px',
    fontWeight: '500',
  },
  inputWrapper: {
    marginBottom: '18px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '700',
    color: '#333',
    marginBottom: '8px',
    marginLeft: '4px',
    letterSpacing: '0.3px',
  },
  inputContainer: {
    display: 'flex',
    alignItems: 'center',
    background: '#fff',
    border: '2px solid #e8e8e8',
    borderRadius: '14px',
    padding: '0 14px',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
  },
  inputIcon: {
    fontSize: '20px',
    marginRight: '12px',
  },
  input: {
    flex: '1',
    border: 'none',
    outline: 'none',
    padding: '14px 0',
    fontSize: '15px',
    color: '#333',
    background: 'transparent',
    fontWeight: '500',
  },
  eyeIcon: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    transition: 'transform 0.2s ease',
  },
  eyeIconText: {
    fontSize: '20px',
  },
  loginButton: {
    width: '100%',
    padding: '16px',
    marginTop: '18px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: '14px',
    color: '#fff',
    fontSize: '16px',
    fontWeight: '800',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 6px 20px rgba(102, 126, 234, 0.4)',
    letterSpacing: '0.5px',
  },
  loginButtonDisabled: {
    opacity: '0.7',
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
  spinner: {
    display: 'inline-block',
    width: '18px',
    height: '18px',
    border: '3px solid rgba(255, 255, 255, 0.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
  },
  backButton: {
    width: '100%',
    padding: '12px',
    marginTop: '20px',
    background: 'transparent',
    border: 'none',
    color: '#667eea',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
};

export default SupportLoginScreen;