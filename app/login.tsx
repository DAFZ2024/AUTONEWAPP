import { StyleSheet, View, Text, TextInput, TouchableOpacity, Dimensions, Alert, Linking, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image, Modal, Animated as RNAnimated } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import * as LocalAuthentication from 'expo-local-authentication';
import Constants from 'expo-constants';

const { width, height } = Dimensions.get('window');

// URL del backend en producción
const PRODUCTION_API_URL = 'https://autonewapp-backend.onrender.com/api';
const API_URL = Constants.expoConfig?.extra?.apiUrl || PRODUCTION_API_URL;

// Colores por rol
const ROLE_COLORS = {
  empresa: {
    primary: '#FF6B35',
    secondary: '#FFB347',
    gradient: ['#FF6B35', '#FF8E53', '#FFB347'],
    light: 'rgba(255, 107, 53, 0.15)',
  },
  cliente: {
    primary: '#4ECCA3',
    secondary: '#00D9A5',
    gradient: ['#0C553C', '#0a7a55', '#4ECCA3'],
    light: 'rgba(78, 204, 163, 0.15)',
  },
};

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
      
      console.log('[LOGIN] Intentando login en:', `${API_URL}${endpoint}`);
      console.log('[LOGIN] Datos:', { [emailField]: loginEmail });
      
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

      console.log('[LOGIN] Response status:', response.status);
      const data = await response.json();
      console.log('[LOGIN] Response data:', JSON.stringify(data));

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
    } catch (error: any) {
      console.error('[LOGIN] Error completo:', error);
      const errorMessage = error?.message || 'Error desconocido';
      Alert.alert(
        'Error de conexión', 
        `No se pudo conectar con el servidor.\n\nURL: ${API_URL}\nError: ${errorMessage}\n\nVerifica tu conexión a internet.`
      );
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
      return isLogin ? 'Bienvenido' : 'Crear Cuenta';
    } else if (role === 'empresa') {
      return isLogin ? 'Portal Empresa' : 'Registro Empresa';
    }
    return isLogin ? 'Bienvenido' : 'Registrarse';
  };

  const getRoleSubtitle = () => {
    if (role === 'cliente') {
      return isLogin ? 'Accede a tu cuenta de cliente' : 'Únete a nuestra comunidad';
    } else if (role === 'empresa') {
      return isLogin ? 'Gestiona tu negocio' : 'Registra tu empresa';
    }
    return '';
  };

  const colors = role === 'empresa' ? ROLE_COLORS.empresa : ROLE_COLORS.cliente;



  return (
    <LinearGradient
      colors={role === 'empresa' ? ['#1a1a2e', '#16213e', '#0f0f23'] : ['#0C553C', '#052e21', '#021810']}
      style={styles.container}
    >
      {/* Elementos decorativos de fondo mejorados */}
      <View style={[styles.decorativeOrb, styles.orb1, { backgroundColor: colors.light }]} />
      <View style={[styles.decorativeOrb, styles.orb2, { backgroundColor: colors.light }]} />
      <View style={[styles.decorativeOrb, styles.orb3, { backgroundColor: colors.light }]} />
      <View style={[styles.decorativeOrb, styles.orb4, { backgroundColor: colors.light }]} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header mejorado con logo y animación */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={colors.gradient as any}
                style={styles.logoGradient}
              >
                <View style={styles.logoInner}>
                  <Ionicons 
                    name={role === 'empresa' ? "business" : "car-sport"} 
                    size={32} 
                    color={colors.primary} 
                  />
                </View>
              </LinearGradient>
              <View style={[styles.logoPulse, { borderColor: colors.primary }]} />
            </View>

            <Text style={styles.brandName}>AUTONEW</Text>
            <Text style={styles.title}>{getRoleTitle()}</Text>
            <Text style={styles.subtitle}>{getRoleSubtitle()}</Text>
          </View>

          {/* Formulario con efecto glassmorphism mejorado */}
          <View style={styles.formCard}>
            <BlurView intensity={25} tint="dark" style={styles.blurContainer}>
              <LinearGradient
                colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.05)', 'rgba(0,0,0,0.15)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.formGradient}
              >
                {/* Línea decorativa superior con gradiente */}
                <LinearGradient
                  colors={colors.gradient as any}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.formDecorTop}
                />
                
                {/* Header del formulario */}
                <View style={styles.formHeader}>
                  <View style={[styles.formHeaderIcon, { backgroundColor: colors.light }]}>
                    <Ionicons 
                      name={isLogin ? "log-in-outline" : "person-add-outline"} 
                      size={20} 
                      color={colors.primary} 
                    />
                  </View>
                  <Text style={styles.formTitle}>
                    {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
                  </Text>
                </View>

              {!isLogin && (
                <>
                  <View>
                    <View style={styles.inputWrapper}>
                      <View style={[styles.inputIconBox, { backgroundColor: colors.light }]}>
                        <Ionicons name="person-outline" size={20} color={colors.primary} />
                      </View>
                      <TextInput
                        style={styles.input}
                        placeholder={role === 'empresa' ? 'Nombre del representante' : 'Nombre completo'}
                        placeholderTextColor="rgba(255,255,255,0.4)"
                        value={name}
                        onChangeText={setName}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>

                  <View>
                    <View style={styles.inputWrapper}>
                      <View style={[styles.inputIconBox, { backgroundColor: colors.light }]}>
                        <Ionicons name="at-outline" size={20} color={colors.primary} />
                      </View>
                      <TextInput
                        style={styles.input}
                        placeholder="Nombre de usuario"
                        placeholderTextColor="rgba(255,255,255,0.4)"
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                      />
                    </View>
                  </View>
                  
                  {role === 'empresa' && (
                    <View>
                      <View style={styles.inputWrapper}>
                        <View style={[styles.inputIconBox, { backgroundColor: colors.light }]}>
                          <Ionicons name="briefcase-outline" size={20} color={colors.primary} />
                        </View>
                        <TextInput
                          style={styles.input}
                          placeholder="Nombre de la empresa"
                          placeholderTextColor="rgba(255,255,255,0.4)"
                          value={companyName}
                          onChangeText={setCompanyName}
                          autoCapitalize="words"
                        />
                      </View>
                    </View>
                  )}

                  <View>
                    <View style={styles.inputWrapper}>
                      <View style={[styles.inputIconBox, { backgroundColor: colors.light }]}>
                        <Ionicons name="call-outline" size={20} color={colors.primary} />
                      </View>
                      <TextInput
                        style={styles.input}
                        placeholder="Teléfono (opcional)"
                        placeholderTextColor="rgba(255,255,255,0.4)"
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                      />
                    </View>
                  </View>

                  <View>
                    <View style={styles.inputWrapper}>
                      <View style={[styles.inputIconBox, { backgroundColor: colors.light }]}>
                        <Ionicons name="location-outline" size={20} color={colors.primary} />
                      </View>
                      <TextInput
                        style={styles.input}
                        placeholder="Dirección (opcional)"
                        placeholderTextColor="rgba(255,255,255,0.4)"
                        value={address}
                        onChangeText={setAddress}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>
                </>
              )}
              
              <View style={styles.inputWrapper}>
                <View style={[styles.inputIconBox, { backgroundColor: colors.light }]}>
                  <Ionicons name="mail-outline" size={20} color={colors.primary} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Correo electrónico"
                  placeholderTextColor="rgba(255,255,255,0.4)"
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
                  <View style={[
                    styles.checkbox, 
                    rememberEmail && styles.checkboxChecked,
                    rememberEmail && { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]}>
                    {rememberEmail && (
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    )}
                  </View>
                  <Text style={styles.rememberEmailText}>Recordar correo electrónico</Text>
                </TouchableOpacity>
              )}
              
              <View style={styles.inputWrapper}>
                <View style={[styles.inputIconBox, { backgroundColor: colors.light }]}>
                  <Ionicons name="lock-closed-outline" size={20} color={colors.primary} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Contraseña"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>
              
              {!isLogin && (
                <View style={styles.inputWrapper}>
                  <View style={[styles.inputIconBox, { backgroundColor: colors.light }]}>
                    <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Confirmar contraseña"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                  />
                </View>
              )}
              
              {/* Botón principal con gradiente */}
              <TouchableOpacity 
                style={[styles.loginButton, loading && styles.loginButtonDisabled]} 
                onPress={isLogin ? handleLogin : handleRegister}
                disabled={loading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={colors.gradient as any}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.loginButtonGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Text style={styles.loginButtonText}>
                        {isLogin ? 'INICIAR SESIÓN' : 'REGISTRARSE'}
                      </Text>
                      <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Botón de autenticación biométrica */}
              {isLogin && biometricAvailable && hasSavedCredentials && (
                <View>
                  <View style={styles.biometricDivider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>o usa</Text>
                    <View style={styles.dividerLine} />
                  </View>
                  
                  <TouchableOpacity 
                    style={[styles.biometricButton, { borderColor: colors.primary }]}
                    onPress={handleBiometricLogin}
                    disabled={loading}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.biometricIconContainer, { backgroundColor: colors.light }]}>
                      <Ionicons 
                        name={biometricType === 'face' ? 'scan-outline' : 'finger-print'} 
                        size={28} 
                        color={colors.primary} 
                      />
                    </View>
                    <Text style={[styles.biometricButtonText, { color: colors.primary }]}>
                    {biometricType === 'face' ? 'Reconocimiento Facial' : 'Huella Dactilar'}
                  </Text>
                  </TouchableOpacity>
                </View>
              )}
              
              {/* Mensaje para habilitar biometría */}
              {isLogin && biometricAvailable && !hasSavedCredentials && (
                <View>
                  <View style={styles.biometricHint}>
                    <View style={[styles.biometricHintIcon, { backgroundColor: colors.light }]}>
                      <Ionicons name="finger-print" size={16} color={colors.primary} />
                    </View>
                    <Text style={styles.biometricHintText}>
                    Inicia sesión para habilitar acceso con huella
                  </Text>
                  </View>
                </View>
              )}
              
              {/* Toggle entre login y registro */}
              <View style={styles.toggleContainer}>
                {role === 'empresa' ? (
                  <TouchableOpacity 
                    style={[styles.toggleButton, { borderColor: colors.light }]} 
                    onPress={() => Linking.openURL('https://autonew-produccion.onrender.com/empresas/')}
                  >
                    <Text style={styles.toggleButtonText}>
                      {isLogin ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
                      <Text style={[styles.toggleButtonTextBold, { color: colors.primary }]}>
                        {isLogin ? 'Regístrate aquí' : 'Inicia sesión'}
                      </Text>
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={[styles.toggleButton, { borderColor: colors.light }]} 
                    onPress={toggleMode}
                  >
                    <Text style={styles.toggleButtonText}>
                      {isLogin ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
                      <Text style={[styles.toggleButtonTextBold, { color: colors.primary }]}>
                        {isLogin ? 'Regístrate aquí' : 'Inicia sesión'}
                      </Text>
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              </LinearGradient>
            </BlurView>
          </View>

          {/* Botón de volver */}
          <View>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <View style={[styles.backButtonIcon, { backgroundColor: colors.light }]}>
                <Ionicons name="arrow-back" size={18} color={colors.primary} />
              </View>
              <Text style={styles.backButtonText}>Volver al inicio</Text>
            </TouchableOpacity>
          </View>
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
              colors={colors.gradient as any}
              style={styles.successModalGradient}
            >
              {/* Círculos decorativos */}
              <View style={styles.decorativeCircle1} />
              <View style={styles.decorativeCircle2} />
              <View style={styles.decorativeCircle3} />
              
              {/* Ícono de éxito animado */}
              <Animated.View 
                entering={ZoomIn.delay(200).duration(500).springify()}
                style={styles.successIconContainer}
              >
                <View style={styles.successIconOuter}>
                  <View style={styles.successIconInner}>
                    <Ionicons name="checkmark" size={50} color={colors.primary} />
                  </View>
                </View>
              </Animated.View>

              {/* Texto de éxito */}
              <Animated.View entering={FadeIn.delay(400).duration(500)}>
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
  // Elementos decorativos
  decorativeOrb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orb1: {
    width: 120,
    height: 120,
    top: -30,
    right: -30,
  },
  orb2: {
    width: 100,
    height: 100,
    bottom: 60,
    left: -40,
  },
  orb3: {
    width: 70,
    height: 70,
    top: height * 0.35,
    right: -20,
  },
  orb4: {
    width: 50,
    height: 50,
    top: height * 0.6,
    left: 20,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
    paddingTop: 35,
    paddingBottom: 20,
  },
  // Header mejorado
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 14,
  },
  logoGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 3,
  },
  logoInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoPulse: {
    position: 'absolute',
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    top: -6,
    left: -6,
    opacity: 0.3,
  },
  brandName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 4,
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.95)',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.65)',
    textAlign: 'center',
  },
  // Form Card con Glassmorphism mejorado
  formCard: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 18,
  },
  blurContainer: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  formGradient: {
    padding: 22,
    paddingTop: 18,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  formDecorTop: {
    position: 'absolute',
    top: 0,
    left: 40,
    right: 40,
    height: 3,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    gap: 10,
  },
  formHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  // Inputs con estilo mejorado
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
  },
  inputIconBox: {
    width: 48,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 15,
    color: '#fff',
    paddingHorizontal: 14,
  },
  // Login Button mejorado
  loginButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loginButtonGradient: {
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  // Toggle Button mejorado
  toggleContainer: {
    marginTop: 6,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  toggleButtonText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 14,
  },
  toggleButtonTextBold: {
    fontWeight: '700',
  },
  // Back Button
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    padding: 8,
  },
  backButtonIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  backButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  // Modal de Éxito
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successModalContainer: {
    width: width * 0.85,
    maxWidth: 350,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.5,
    shadowRadius: 25,
    elevation: 25,
  },
  successModalGradient: {
    padding: 35,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  decorativeCircle1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    top: -60,
    right: -60,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    bottom: -40,
    left: -40,
  },
  decorativeCircle3: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    top: 100,
    right: -20,
  },
  successIconContainer: {
    marginBottom: 24,
  },
  successIconOuter: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIconInner: {
    width: 85,
    height: 85,
    borderRadius: 42.5,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  successSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 28,
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
    marginBottom: 12,
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
  // Estilos de autenticación biométrica mejorados
  biometricDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  dividerText: {
    color: 'rgba(255, 255, 255, 0.55)',
    paddingHorizontal: 14,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
    height: 50,
    marginBottom: 10,
    borderWidth: 1.5,
  },
  biometricIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  biometricButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  biometricHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginBottom: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
  },
  biometricHintIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  biometricHintText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    marginLeft: 10,
    fontStyle: 'italic',
  },
  // Estilos para recordar correo mejorados
  rememberEmailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: -2,
    paddingLeft: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    borderColor: 'transparent',
  },
  rememberEmailText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    fontWeight: '500',
  },
});