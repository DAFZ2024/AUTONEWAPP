import { StyleSheet, View, Text, TextInput, TouchableOpacity, Dimensions, Alert, Linking, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image, Modal } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp, FadeIn, ZoomIn, SlideInUp } from 'react-native-reanimated';
import * as LocalAuthentication from 'expo-local-authentication';
import Constants from 'expo-constants';

const { width, height } = Dimensions.get('window');

// URL del backend - Se configura desde app.config.js
const API_URL = Constants.expoConfig?.extra?.apiUrl || 'https://autonewapp-backend.onrender.com/api';

export default function LoginScreen() {
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role: string }>();
  const [isLogin, setIsLogin] = useState(true); // true = login, false = registro
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: '', message: '' });
  const [redirectTo, setRedirectTo] = useState<string | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [hasSavedCredentials, setHasSavedCredentials] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('biometrics');
  const [rememberEmail, setRememberEmail] = useState(true);

  // Cargar correo guardado y verificar biometría
  useEffect(() => {
    loadSavedEmail();
    checkBiometricAvailability();
  }, [role]);

  const loadSavedEmail = async () => {
    try {
      const storageKey = role === 'empresa' ? 'saved_empresa_email' : 'saved_user_email';
      const savedEmail = await AsyncStorage.getItem(storageKey);
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberEmail(true);
      }
    } catch (error) {
      console.log('Error loading saved email:', error);
    }
  };

  const saveEmail = async (emailToSave: string) => {
    try {
      const storageKey = role === 'empresa' ? 'saved_empresa_email' : 'saved_user_email';
      if (rememberEmail && emailToSave) {
        await AsyncStorage.setItem(storageKey, emailToSave);
      } else {
        await AsyncStorage.removeItem(storageKey);
      }
    } catch (error) {
      console.log('Error saving email:', error);
    }
  };

  const checkBiometricAvailability = async () => {
    try {
      // Verificar si el hardware soporta biometría
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      
      if (compatible && enrolled) {
        setBiometricAvailable(true);
        
        // Obtener tipos de autenticación disponibles
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBiometricType('fingerprint');
        } else if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricType('face');
        }
        
        // Verificar si hay credenciales guardadas para este rol
        const storageKey = role === 'empresa' ? 'saved_empresa_credentials' : 'saved_user_credentials';
        const savedCreds = await AsyncStorage.getItem(storageKey);
        if (savedCreds) {
          setHasSavedCredentials(true);
        }
      }
    } catch (error) {
      console.log('Error checking biometric:', error);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Inicia sesión con tu huella dactilar',
        cancelLabel: 'Cancelar',
        disableDeviceFallback: false,
        fallbackLabel: 'Usar contraseña',
      });

      if (result.success) {
        // Obtener credenciales guardadas
        const storageKey = role === 'empresa' ? 'saved_empresa_credentials' : 'saved_user_credentials';
        const savedCreds = await AsyncStorage.getItem(storageKey);
        
        if (savedCreds) {
          const { email: savedEmail, password: savedPassword } = JSON.parse(savedCreds);
          setEmail(savedEmail);
          setPassword(savedPassword);
          
          // Realizar login automático
          await performLogin(savedEmail, savedPassword);
        } else {
          Alert.alert('Error', 'No hay credenciales guardadas. Inicia sesión manualmente primero.');
        }
      } else if (result.error === 'user_cancel') {
        // Usuario canceló, no hacer nada
      } else {
        Alert.alert('Error', 'Autenticación fallida. Intenta de nuevo.');
      }
    } catch (error) {
      console.error('Error en autenticación biométrica:', error);
      Alert.alert('Error', 'No se pudo realizar la autenticación biométrica.');
    }
  };

  const saveCredentialsForBiometric = async (emailToSave: string, passwordToSave: string) => {
    try {
      const storageKey = role === 'empresa' ? 'saved_empresa_credentials' : 'saved_user_credentials';
      await AsyncStorage.setItem(storageKey, JSON.stringify({
        email: emailToSave,
        password: passwordToSave
      }));
      setHasSavedCredentials(true);
    } catch (error) {
      console.log('Error saving credentials:', error);
    }
  };

  const performLogin = async (loginEmail: string, loginPassword: string) => {
    setLoading(true);
    
    try {
      const endpoint = role === 'empresa' ? '/auth/empresa/login' : '/auth/login';
      const emailField = role === 'empresa' ? 'email' : 'correo';
      
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [emailField]: loginEmail,
          password: loginPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert('Error', data.message || 'Error al iniciar sesión');
        setLoading(false);
        return;
      }

      // Guardar token y datos del usuario/empresa
      await AsyncStorage.setItem('token', data.data.token);
      
      if (role === 'empresa') {
        await AsyncStorage.setItem('empresa', JSON.stringify(data.data.empresa));
        await AsyncStorage.setItem('userType', 'empresa');
      } else {
        await AsyncStorage.setItem('user', JSON.stringify(data.data.user));
        await AsyncStorage.setItem('userType', 'cliente');
      }

      // Guardar credenciales para biometría si está disponible
      if (biometricAvailable) {
        await saveCredentialsForBiometric(loginEmail, loginPassword);
      }

      // Guardar el correo si "Recordar correo" está activo
      await saveEmail(loginEmail);

      // Mostrar modal de éxito
      const userName = role === 'empresa' 
        ? data.data.empresa?.nombre || 'Empresa'
        : data.data.user?.nombre_completo?.split(' ')[0] || 'Usuario';
      
      showSuccess(
        `¡Bienvenido${role === 'empresa' ? '' : ', ' + userName}!`,
        role === 'empresa' 
          ? 'Acceso al portal de empresa exitoso'
          : 'Nos alegra verte de nuevo',
        role === 'empresa' ? 'empresa' : 'client'
      );
    } catch (error) {
      console.error('Error en login:', error);
      Alert.alert('Error', 'No se pudo conectar con el servidor. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  };

  // Efecto para manejar la redirección después del modal
  useEffect(() => {
    if (redirectTo && !showSuccessModal) {
      const timer = setTimeout(() => {
        if (redirectTo === 'client') {
          router.replace('./client-dashboard');
        } else if (redirectTo === 'empresa') {
          router.replace('./company-dashboard');
        }
        setRedirectTo(null);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showSuccessModal, redirectTo]);

  const showSuccess = (title: string, message: string, redirect: string) => {
    setSuccessMessage({ title, message });
    setShowSuccessModal(true);
    
    // Auto cerrar y redirigir después de 2 segundos
    setTimeout(() => {
      setShowSuccessModal(false);
      setRedirectTo(redirect);
    }, 2000);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }
    
    await performLogin(email, password);
  };

  const handleRegister = async () => {
    const requiredFields = [email, password, confirmPassword, name, username];
    if (role === 'empresa') {
      requiredFields.push(companyName);
    }
    
    if (requiredFields.some(field => !field)) {
      Alert.alert('Error', 'Por favor completa todos los campos requeridos');
      return;
    }
    
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre_completo: name,
          nombre_usuario: username,
          correo: email,
          password: password,
          telefono: phone || '',
          direccion: address || '',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert('Error', data.message || 'Error al registrar usuario');
        setLoading(false);
        return;
      }

      // Guardar token y datos del usuario
      await AsyncStorage.setItem('token', data.data.token);
      await AsyncStorage.setItem('user', JSON.stringify(data.data.user));
      await AsyncStorage.setItem('userType', 'cliente');

      // Mostrar modal de éxito para registro
      showSuccess(
        '¡Registro Exitoso!',
        'Tu cuenta ha sido creada correctamente',
        'client'
      );
    } catch (error) {
      console.error('Error en registro:', error);
      Alert.alert('Error', 'No se pudo conectar con el servidor. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    // Limpiar campos al cambiar de modo
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setName('');
    setUsername('');
    setPhone('');
    setAddress('');
    setCompanyName('');
  };

  const handleBack = () => {
    router.back();
  };

  const getRoleTitle = () => {
    if (role === 'cliente') {
      return isLogin ? 'Bienvenido cliente ' : 'Crear Cuenta Cliente';
    } else if (role === 'empresa') {
      return isLogin ? 'Portal Empresa' : 'Registro Empresa';
    }
    return isLogin ? 'Bienvenido' : 'Registrarse';
  };

  return (
    <LinearGradient
      colors={['#0C553C', '#052e21', '#000000']}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInUp.delay(200).duration(1000)} style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name={role === 'empresa' ? "business" : "person"} size={40} color="#0C553C" />
            </View>
            <Text style={styles.title}>{getRoleTitle()}</Text>
            <Text style={styles.subtitle}>
              {isLogin ? 'Ingresa tus credenciales para continuar' : 'Completa el formulario para unirte'}
            </Text>
          </Animated.View>
          
          <Animated.View entering={FadeInDown.delay(400).duration(1000)} style={styles.formContainer}>
            {!isLogin && (
              <>
                <View style={styles.inputContainer}>
                  <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder={role === 'empresa' ? 'Nombre del representante' : 'Nombre completo'}
                    placeholderTextColor="#999"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Ionicons name="at-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Nombre de usuario"
                    placeholderTextColor="#999"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                  />
                </View>
                
                {role === 'empresa' && (
                  <View style={styles.inputContainer}>
                    <Ionicons name="briefcase-outline" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Nombre de la empresa"
                      placeholderTextColor="#999"
                      value={companyName}
                      onChangeText={setCompanyName}
                      autoCapitalize="words"
                    />
                  </View>
                )}

                <View style={styles.inputContainer}>
                  <Ionicons name="call-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Teléfono (opcional)"
                    placeholderTextColor="#999"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Ionicons name="location-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Dirección (opcional)"
                    placeholderTextColor="#999"
                    value={address}
                    onChangeText={setAddress}
                    autoCapitalize="words"
                  />
                </View>
              </>
            )}
            
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Correo electrónico"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Checkbox Recordar correo - solo en modo login */}
            {isLogin && (
              <TouchableOpacity 
                style={styles.rememberEmailContainer}
                onPress={() => setRememberEmail(!rememberEmail)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, rememberEmail && styles.checkboxChecked]}>
                  {rememberEmail && (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  )}
                </View>
                <Text style={styles.rememberEmailText}>Recordar correo electrónico</Text>
              </TouchableOpacity>
            )}
            
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Contraseña"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
            
            {!isLogin && (
              <View style={styles.inputContainer}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirmar contraseña"
                  placeholderTextColor="#999"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
              </View>
            )}
            
            <TouchableOpacity 
              style={[styles.loginButton, loading && styles.loginButtonDisabled]} 
              onPress={isLogin ? handleLogin : handleRegister}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#0C553C" size="small" />
              ) : (
                <Text style={styles.loginButtonText}>
                  {isLogin ? 'INICIAR SESIÓN' : 'REGISTRARSE'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Botón de autenticación biométrica */}
            {isLogin && biometricAvailable && hasSavedCredentials && (
              <Animated.View entering={FadeIn.delay(300).duration(400)}>
                <View style={styles.biometricDivider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>o usa</Text>
                  <View style={styles.dividerLine} />
                </View>
                
                <TouchableOpacity 
                  style={styles.biometricButton}
                  onPress={handleBiometricLogin}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <View style={styles.biometricIconContainer}>
                    <Ionicons 
                      name={biometricType === 'face' ? 'scan-outline' : 'finger-print'} 
                      size={28} 
                      color="#0C553C" 
                    />
                  </View>
                  <Text style={styles.biometricButtonText}>
                    {biometricType === 'face' ? 'Reconocimiento Facial' : 'Huella Dactilar'}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* Mensaje para habilitar biometría */}
            {isLogin && biometricAvailable && !hasSavedCredentials && (
              <Animated.View entering={FadeIn.delay(300).duration(400)}>
                <View style={styles.biometricHint}>
                  <Ionicons name="finger-print" size={18} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.biometricHintText}>
                    Inicia sesión para habilitar acceso con huella
                  </Text>
                </View>
              </Animated.View>
            )}
            
            {role === 'empresa' ? (
              <TouchableOpacity style={styles.toggleButton} onPress={() => Linking.openURL('https://www.autonew.com/empresas')}>
                <Text style={styles.toggleButtonText}>
                  {isLogin ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
                  <Text style={styles.toggleButtonTextBold}>
                    {isLogin ? 'Regístrate aquí' : 'Inicia sesión'}
                  </Text>
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.toggleButton} onPress={toggleMode}>
                <Text style={styles.toggleButtonText}>
                  {isLogin ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
                  <Text style={styles.toggleButtonTextBold}>
                    {isLogin ? 'Regístrate aquí' : 'Inicia sesión'}
                  </Text>
                </Text>
              </TouchableOpacity>
            )}
          </Animated.View>

          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
            <Text style={styles.backButtonText}>Volver al inicio</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal de Éxito */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <Animated.View 
            entering={ZoomIn.duration(400).springify()}
            style={styles.successModalContainer}
          >
            <LinearGradient
              colors={['#0C553C', '#085c3a', '#0a6b44']}
              style={styles.successModalGradient}
            >
              {/* Círculos decorativos */}
              <View style={styles.decorativeCircle1} />
              <View style={styles.decorativeCircle2} />
              
              {/* Ícono de éxito animado */}
              <Animated.View 
                entering={ZoomIn.delay(200).duration(500).springify()}
                style={styles.successIconContainer}
              >
                <View style={styles.successIconOuter}>
                  <View style={styles.successIconInner}>
                    <Ionicons name="checkmark" size={50} color="#0C553C" />
                  </View>
                </View>
              </Animated.View>

              {/* Texto de éxito */}
              <Animated.View entering={FadeInUp.delay(400).duration(500)}>
                <Text style={styles.successTitle}>{successMessage.title}</Text>
                <Text style={styles.successSubtitle}>{successMessage.message}</Text>
              </Animated.View>

              {/* Indicador de progreso */}
              <Animated.View 
                entering={FadeIn.delay(600).duration(400)}
                style={styles.progressContainer}
              >
                <View style={styles.progressBar}>
                  <Animated.View 
                    style={[styles.progressFill, { width: '100%' }]}
                  />
                </View>
                <Text style={styles.redirectText}>Redirigiendo...</Text>
              </Animated.View>
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 15,
    height: 55,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#333',
  },
  loginButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#0C553C',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  toggleButton: {
    alignItems: 'center',
    padding: 10,
  },
  toggleButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  toggleButtonTextBold: {
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
    padding: 10,
    opacity: 0.8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 8,
  },
  // Estilos del Modal de Éxito
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successModalContainer: {
    width: width * 0.85,
    maxWidth: 350,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  successModalGradient: {
    padding: 30,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  decorativeCircle1: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    top: -50,
    right: -50,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    bottom: -30,
    left: -30,
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successIconOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIconInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  successSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 25,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBar: {
    width: '80%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  redirectText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontStyle: 'italic',
  },
  // Estilos de autenticación biométrica
  biometricDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 15,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  dividerText: {
    color: 'rgba(255, 255, 255, 0.7)',
    paddingHorizontal: 15,
    fontSize: 14,
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    height: 55,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 3,
  },
  biometricIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(12, 85, 60, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  biometricButtonText: {
    color: '#0C553C',
    fontSize: 16,
    fontWeight: '600',
  },
  biometricHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginBottom: 5,
  },
  biometricHintText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    marginLeft: 8,
    fontStyle: 'italic',
  },
  // Estilos para recordar correo
  rememberEmailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: -8,
    paddingLeft: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: '#0C553C',
    borderColor: '#0C553C',
  },
  rememberEmailText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 14,
  },
});