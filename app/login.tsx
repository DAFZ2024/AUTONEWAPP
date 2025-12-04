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
      {/* Elementos decorativos de fondo */}
      <View style={[styles.decorativeOrb, styles.orb1, { backgroundColor: colors.light }]} />
      <View style={[styles.decorativeOrb, styles.orb2, { backgroundColor: colors.light }]} />
      <View style={[styles.decorativeOrb, styles.orb3, { backgroundColor: colors.light }]} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header con ícono */}
          <View style={styles.header}>
            <View style={styles.iconWrapper}>
              <LinearGradient
                colors={colors.gradient as any}
                style={styles.iconGradient}
              >
                <View style={styles.iconInner}>
                  <Ionicons 
                    name={role === 'empresa' ? "business" : "person"} 
                    size={45} 
                    color={colors.primary} 
                  />
                </View>
              </LinearGradient>
              {/* Anillo exterior */}
              <View style={[styles.iconRingOuter, { borderColor: colors.primary }]} />
            </View>

            <Text style={styles.title}>
              {getRoleTitle()}
            </Text>
            <Text style={styles.subtitle}>
              {getRoleSubtitle()}
            </Text>

            {/* Badge de rol */}
            <View style={[styles.roleBadge, { backgroundColor: colors.light, borderColor: colors.primary }]}>
              <Ionicons 
                name={role === 'empresa' ? 'briefcase' : 'star'} 
                size={14} 
                color={colors.primary} 
              />
              <Text style={[styles.roleBadgeText, { color: colors.primary }]}>
                {role === 'empresa' ? 'Cuenta Empresarial' : 'Cuenta Personal'}
              </Text>
            </View>
          </View>

          {/* Formulario con efecto glassmorphism */}
          <View style={styles.formCard}>
            {/* Fondo con blur */}
            <BlurView intensity={25} tint="dark" style={styles.blurContainer}>
              <LinearGradient
                colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)', 'rgba(0,0,0,0.1)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.formGradient}
              >
                {/* Decoración superior */}
                <View style={[styles.formDecorTop, { backgroundColor: colors.primary }]} />
                
                {/* Header del formulario con ícono */}
                <View style={styles.formHeader}>
                  <View style={[styles.formIconWrapper, { backgroundColor: colors.light }]}>
                    <Ionicons 
                      name={isLogin ? 'log-in-outline' : 'person-add-outline'} 
                      size={28} 
                      color={colors.primary} 
                    />
                  </View>
                  <Text style={styles.formTitle}>
                    {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
                  </Text>
                  <Text style={styles.formSubtitle}>
                    {isLogin ? 'Ingresa tus credenciales' : 'Completa tus datos'}
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
                <View style={styles.toggleDivider}>
                  <View style={styles.toggleDividerLine} />
                  <Ionicons name="ellipse" size={6} color="rgba(255,255,255,0.3)" />
                  <View style={styles.toggleDividerLine} />
                </View>
                
                {role === 'empresa' ? (
                  <TouchableOpacity 
                    style={[styles.toggleButton, { borderColor: colors.light }]} 
                    onPress={() => Linking.openURL('https://autonew-produccion.onrender.com/empresas/')}
                  >
                    <Ionicons name="open-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
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
                    <Ionicons 
                      name={isLogin ? 'person-add-outline' : 'log-in-outline'} 
                      size={18} 
                      color={colors.primary} 
                      style={{ marginRight: 8 }} 
                    />
                    <Text style={styles.toggleButtonText}>
                      {isLogin ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
                      <Text style={[styles.toggleButtonTextBold, { color: colors.primary }]}>
                        {isLogin ? 'Regístrate aquí' : 'Inicia sesión'}
                      </Text>
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              
              {/* Decoración inferior */}
              <View style={styles.formFooterDecor}>
                <View style={[styles.footerDot, { backgroundColor: colors.primary }]} />
                <View style={[styles.footerDot, styles.footerDotSmall, { backgroundColor: colors.secondary }]} />
                <View style={[styles.footerDot, { backgroundColor: colors.primary }]} />
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
    width: 200,
    height: 200,
    top: -50,
    right: -50,
  },
  orb2: {
    width: 150,
    height: 150,
    bottom: 100,
    left: -60,
  },
  orb3: {
    width: 100,
    height: 100,
    top: height * 0.4,
    right: -30,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingTop: 50,
    paddingBottom: 30,
  },
  // Header
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  iconWrapper: {
    position: 'relative',
    marginBottom: 20,
  },
  iconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 5,
  },
  iconInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconRingOuter: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderStyle: 'dashed',
    top: -10,
    left: -10,
    opacity: 0.3,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.75)',
    textAlign: 'center',
    marginBottom: 15,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  roleBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Form Card con Glassmorphism
  formCard: {
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.4,
    shadowRadius: 25,
    elevation: 20,
  },
  blurContainer: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  formGradient: {
    padding: 28,
    paddingTop: 20,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  formDecorTop: {
    position: 'absolute',
    top: 0,
    left: 30,
    right: 30,
    height: 3,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  formHeader: {
    alignItems: 'center',
    marginBottom: 28,
  },
  formIconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  formSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  // Inputs con estilo mejorado
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 18,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  inputIconBox: {
    width: 54,
    height: 58,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.08)',
  },
  input: {
    flex: 1,
    height: 58,
    fontSize: 15,
    color: '#fff',
    paddingHorizontal: 16,
  },
  // Login Button
  loginButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 10,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loginButtonGradient: {
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  // Toggle Button
  toggleContainer: {
    marginTop: 10,
  },
  toggleDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  toggleDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  toggleButtonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  toggleButtonTextBold: {
    fontWeight: 'bold',
  },
  formFooterDecor: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    gap: 8,
  },
  footerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.6,
  },
  footerDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.4,
  },
  // Back Button
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 25,
    padding: 12,
  },
  backButtonIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  backButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 15,
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
  // Estilos de autenticación biométrica
  biometricDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dividerText: {
    color: 'rgba(255, 255, 255, 0.6)',
    paddingHorizontal: 16,
    fontSize: 13,
    fontWeight: '500',
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    height: 56,
    marginBottom: 12,
    borderWidth: 1.5,
  },
  biometricIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  biometricButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  biometricHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  biometricHintIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  biometricHintText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    marginLeft: 10,
    fontStyle: 'italic',
  },
  // Estilos para recordar correo
  rememberEmailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    marginTop: -6,
    paddingLeft: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    borderColor: 'transparent',
  },
  rememberEmailText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 14,
  },
});