import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator,
  Alert,
  Modal,
  ActionSheetIOS,
  Platform
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { getUser, getProfile, updateProfile, changePassword, logout, User, actualizarFotoPerfilUsuario, eliminarFotoPerfilUsuario } from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ClientProfile() {
  const router = useRouter();
  
  // Estado del usuario
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Campos del formulario
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [nombreUsuario, setNombreUsuario] = useState('');
  
  // Estados para cambio de contraseña
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Estados de UI
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  
  // Estado para foto de perfil
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showImageOptions, setShowImageOptions] = useState(false);

  // Cargar datos del usuario al montar el componente
  useEffect(() => {
    loadUserData();
  }, []);

  // Detectar cambios en el formulario
  useEffect(() => {
    if (user) {
      const changes = 
        nombreCompleto !== (user.nombre_completo || '') ||
        telefono !== (user.telefono || '') ||
        direccion !== (user.direccion || '');
      setHasChanges(changes);
    }
  }, [nombreCompleto, telefono, direccion, user]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Función para limpiar URL duplicada de Cloudinary
      const cleanCloudinaryUrl = (url: string | null | undefined): string | null => {
        if (!url || typeof url !== 'string') return null;
        
        let cleanUrl = url.trim();
        if (!cleanUrl) return null;
        
        // Detectar y corregir URL duplicada de Cloudinary
        const cloudinaryUploadPattern = 'cloudinary.com/ducn8dj4o/image/upload/';
        const firstIndex = cleanUrl.indexOf(cloudinaryUploadPattern);
        const lastIndex = cleanUrl.lastIndexOf(cloudinaryUploadPattern);
        
        if (firstIndex !== -1 && lastIndex !== -1 && firstIndex !== lastIndex) {
          const correctPart = cleanUrl.substring(lastIndex);
          cleanUrl = 'https://res.' + correctPart;
          console.log('[Profile] 🔧 URL corregida:', cleanUrl);
        }
        
        // Verificar que sea una URL válida
        if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
          return cleanUrl;
        }
        return null;
      };
      
      // Primero intentar obtener del backend
      const profileResponse = await getProfile();
      
      if (profileResponse.success && profileResponse.data) {
        const userData = profileResponse.data;
        setUser(userData);
        setNombreCompleto(userData.nombre_completo || '');
        setEmail(userData.correo || '');
        setTelefono(userData.telefono || '');
        setDireccion(userData.direccion || '');
        setNombreUsuario(userData.nombre_usuario || '');
        // Cargar foto de perfil con limpieza de URL
        const cleanedUrl = cleanCloudinaryUrl(userData.profile_picture);
        if (cleanedUrl) {
          console.log('[Profile] ✅ Foto de perfil:', cleanedUrl);
          setProfilePicture(cleanedUrl);
        }
      } else {
        // Fallback a datos locales
        const localUser = await getUser();
        if (localUser) {
          setUser(localUser);
          setNombreCompleto(localUser.nombre_completo || '');
          setEmail(localUser.correo || '');
          setTelefono(localUser.telefono || '');
          setDireccion(localUser.direccion || '');
          setNombreUsuario(localUser.nombre_usuario || '');
          // Cargar foto de perfil con limpieza de URL
          const cleanedUrl = cleanCloudinaryUrl(localUser.profile_picture);
          if (cleanedUrl) {
            console.log('[Profile] ✅ Fallback foto de perfil:', cleanedUrl);
            setProfilePicture(cleanedUrl);
          }
        } else {
          setError('No se pudo cargar la información del usuario');
        }
      }
    } catch (err) {
      console.error('Error al cargar datos:', err);
      setError('Error al cargar los datos del perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!hasChanges) {
      Alert.alert('Información', 'No hay cambios para guardar');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const updateData: Partial<User> = {};
      
      if (nombreCompleto !== user?.nombre_completo) {
        updateData.nombre_completo = nombreCompleto;
      }
      if (telefono !== user?.telefono) {
        updateData.telefono = telefono;
      }
      if (direccion !== user?.direccion) {
        updateData.direccion = direccion;
      }

      const response = await updateProfile(updateData);

      if (response.success) {
        setSaved(true);
        if (response.data) {
          setUser(response.data);
        }
        setTimeout(() => setSaved(false), 2000);
        Alert.alert('Éxito', 'Perfil actualizado correctamente');
      } else {
        setError(response.message || 'Error al actualizar el perfil');
        Alert.alert('Error', response.message || 'No se pudo actualizar el perfil');
      }
    } catch (err) {
      console.error('Error al guardar:', err);
      setError('Error al guardar los cambios');
      Alert.alert('Error', 'Ocurrió un error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    // Validaciones
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Todos los campos son requeridos');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    try {
      setChangingPassword(true);
      const response = await changePassword(currentPassword, newPassword);

      if (response.success) {
        Alert.alert('Éxito', 'Contraseña actualizada correctamente');
        setShowPasswordModal(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        Alert.alert('Error', response.message || 'No se pudo cambiar la contraseña');
      }
    } catch (err) {
      console.error('Error al cambiar contraseña:', err);
      Alert.alert('Error', 'Ocurrió un error al cambiar la contraseña');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login');
          }
        }
      ]
    );
  };

  // Funciones para gestionar foto de perfil
  const handleImageOptions = () => {
    if (Platform.OS === 'ios') {
      const options = profilePicture 
        ? ['Tomar foto', 'Elegir de galería', 'Eliminar foto', 'Cancelar']
        : ['Tomar foto', 'Elegir de galería', 'Cancelar'];
      
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
          destructiveButtonIndex: profilePicture ? 2 : undefined,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) takePhoto();
          else if (buttonIndex === 1) selectImage();
          else if (buttonIndex === 2 && profilePicture) handleDeleteProfileImage();
        }
      );
    } else {
      setShowImageOptions(true);
    }
  };

  const selectImage = async () => {
    setShowImageOptions(false);
    
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a tu galería para seleccionar una imagen.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await handleUpdateProfileImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    setShowImageOptions(false);
    
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a tu cámara para tomar una foto.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await handleUpdateProfileImage(result.assets[0].uri);
    }
  };

  const handleUpdateProfileImage = async (imageUri: string) => {
    try {
      setUploadingImage(true);
      
      const response = await actualizarFotoPerfilUsuario(imageUri);
      
      if (response.success && response.data) {
        const newImageUrl = response.data.profile_picture;
        setProfilePicture(newImageUrl);
        
        // Actualizar el usuario en AsyncStorage
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          user.profile_picture = newImageUrl;
          await AsyncStorage.setItem('user', JSON.stringify(user));
        }
        
        Alert.alert('Éxito', 'Foto de perfil actualizada correctamente');
      } else {
        Alert.alert('Error', response.message || 'No se pudo actualizar la foto');
      }
    } catch (error) {
      console.error('Error al actualizar foto:', error);
      Alert.alert('Error', 'Ocurrió un error al actualizar la foto de perfil');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteProfileImage = () => {
    setShowImageOptions(false);
    
    Alert.alert(
      'Eliminar foto',
      '¿Estás seguro de que deseas eliminar tu foto de perfil?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setUploadingImage(true);
              
              const response = await eliminarFotoPerfilUsuario();
              
              if (response.success) {
                setProfilePicture(null);
                
                // Actualizar el usuario en AsyncStorage
                const userData = await AsyncStorage.getItem('user');
                if (userData) {
                  const user = JSON.parse(userData);
                  user.profile_picture = null;
                  await AsyncStorage.setItem('user', JSON.stringify(user));
                }
                
                Alert.alert('Éxito', 'Foto de perfil eliminada');
              } else {
                Alert.alert('Error', response.message || 'No se pudo eliminar la foto');
              }
            } catch (error) {
              console.error('Error al eliminar foto:', error);
              Alert.alert('Error', 'Ocurrió un error al eliminar la foto');
            } finally {
              setUploadingImage(false);
            }
          }
        }
      ]
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0C553C" />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('./client-dashboard')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Mi Perfil</Text>
        <View style={{ width: 70 }} />
      </View>

      {/* Foto de perfil */}
      <View style={styles.profileSection}>
        <TouchableOpacity 
          style={styles.profileImageContainer} 
          onPress={handleImageOptions}
          disabled={uploadingImage}
        >
          {uploadingImage ? (
            <View style={styles.photoCircle}>
              <ActivityIndicator size="large" color="#0C553C" />
            </View>
          ) : profilePicture ? (
            <Image
              source={{ uri: profilePicture }}
              style={styles.profileImage}
              contentFit="cover"
            />
          ) : (
            <View style={styles.photoCircle}>
              <Text style={styles.initials}>{getInitials(nombreCompleto || 'U')}</Text>
            </View>
          )}
          <View style={styles.editImageBadge}>
            <Ionicons name="camera" size={16} color="#fff" />
          </View>
        </TouchableOpacity>
        <Text style={styles.profileImageHint}>Toca para cambiar foto</Text>
        <Text style={styles.userName}>{nombreCompleto}</Text>
        <Text style={styles.userEmail}>{email}</Text>
      </View>

      {/* Modal de opciones de imagen (Android) */}
      <Modal
        visible={showImageOptions}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageOptions(false)}
      >
        <TouchableOpacity 
          style={styles.imageOptionsOverlay} 
          activeOpacity={1} 
          onPress={() => setShowImageOptions(false)}
        >
          <View style={styles.imageOptionsContainer}>
            <Text style={styles.imageOptionsTitle}>Foto de perfil</Text>
            
            <TouchableOpacity style={styles.imageOption} onPress={takePhoto}>
              <Ionicons name="camera-outline" size={24} color="#0C553C" />
              <Text style={styles.imageOptionText}>Tomar foto</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.imageOption} onPress={selectImage}>
              <Ionicons name="images-outline" size={24} color="#0C553C" />
              <Text style={styles.imageOptionText}>Elegir de galería</Text>
            </TouchableOpacity>
            
            {profilePicture && (
              <TouchableOpacity style={styles.imageOption} onPress={handleDeleteProfileImage}>
                <Ionicons name="trash-outline" size={24} color="#DC3545" />
                <Text style={[styles.imageOptionText, { color: '#DC3545' }]}>Eliminar foto</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[styles.imageOption, styles.imageOptionCancel]} 
              onPress={() => setShowImageOptions(false)}
            >
              <Text style={styles.imageOptionCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Formulario */}
      <View style={styles.form}>
        <Text style={styles.sectionTitle}>Información Personal</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            <Ionicons name="person-outline" size={14} color="#0C553C" /> Nombre completo
          </Text>
          <TextInput 
            style={styles.input} 
            value={nombreCompleto} 
            onChangeText={setNombreCompleto} 
            placeholder="Nombre completo" 
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            <Ionicons name="at-outline" size={14} color="#0C553C" /> Nombre de usuario
          </Text>
          <TextInput 
            style={[styles.input, styles.inputDisabled]} 
            value={nombreUsuario} 
            editable={false}
            placeholder="Nombre de usuario"
          />
          <Text style={styles.helperText}>El nombre de usuario no se puede modificar</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            <Ionicons name="mail-outline" size={14} color="#0C553C" /> Correo electrónico
          </Text>
          <TextInput 
            style={[styles.input, styles.inputDisabled]} 
            value={email} 
            editable={false}
            placeholder="Correo electrónico"
          />
          <Text style={styles.helperText}>El correo no se puede modificar</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            <Ionicons name="call-outline" size={14} color="#0C553C" /> Teléfono
          </Text>
          <TextInput 
            style={styles.input} 
            value={telefono} 
            onChangeText={setTelefono} 
            placeholder="Número de teléfono" 
            keyboardType="phone-pad" 
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            <Ionicons name="location-outline" size={14} color="#0C553C" /> Dirección
          </Text>
          <TextInput 
            style={styles.input} 
            value={direccion} 
            onChangeText={setDireccion} 
            placeholder="Dirección" 
            multiline
          />
        </View>

        {/* Botón guardar */}
        <TouchableOpacity 
          style={[styles.saveButton, !hasChanges && styles.saveButtonDisabled]} 
          onPress={handleSave}
          disabled={saving || !hasChanges}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="save-outline" size={18} color="#fff" />
              <Text style={styles.saveButtonText}>
                {hasChanges ? 'Guardar Cambios' : 'Sin cambios'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {saved && (
          <View style={styles.successMessage}>
            <Ionicons name="checkmark-circle" size={18} color="#0C553C" />
            <Text style={styles.successText}>¡Cambios guardados!</Text>
          </View>
        )}

        {/* Separador */}
        <View style={styles.divider} />

        {/* Sección de seguridad */}
        <Text style={styles.sectionTitle}>Seguridad</Text>

        <TouchableOpacity 
          style={styles.securityButton} 
          onPress={() => setShowPasswordModal(true)}
        >
          <View style={styles.securityButtonContent}>
            <Ionicons name="lock-closed-outline" size={22} color="#0C553C" />
            <View style={styles.securityButtonText}>
              <Text style={styles.securityButtonTitle}>Cambiar contraseña</Text>
              <Text style={styles.securityButtonSubtitle}>Actualiza tu contraseña de acceso</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        {/* Botón cerrar sesión */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#DC3545" />
          <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>

      {/* Modal cambio de contraseña */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cambiar Contraseña</Text>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Contraseña actual</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput 
                    style={styles.passwordInput} 
                    value={currentPassword} 
                    onChangeText={setCurrentPassword}
                    placeholder="Ingresa tu contraseña actual"
                    secureTextEntry={!showCurrentPassword}
                  />
                  <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)}>
                    <Ionicons 
                      name={showCurrentPassword ? "eye-off-outline" : "eye-outline"} 
                      size={20} 
                      color="#666" 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nueva contraseña</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput 
                    style={styles.passwordInput} 
                    value={newPassword} 
                    onChangeText={setNewPassword}
                    placeholder="Mínimo 6 caracteres"
                    secureTextEntry={!showNewPassword}
                  />
                  <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                    <Ionicons 
                      name={showNewPassword ? "eye-off-outline" : "eye-outline"} 
                      size={20} 
                      color="#666" 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirmar nueva contraseña</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput 
                    style={styles.passwordInput} 
                    value={confirmPassword} 
                    onChangeText={setConfirmPassword}
                    placeholder="Repite la nueva contraseña"
                    secureTextEntry={!showConfirmPassword}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    <Ionicons 
                      name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                      size={20} 
                      color="#666" 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity 
                style={styles.modalSaveButton}
                onPress={handleChangePassword}
                disabled={changingPassword}
              >
                {changingPassword ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSaveButtonText}>Cambiar Contraseña</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowPasswordModal(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
              >
                <Text style={styles.modalCancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flexGrow: 1, 
    backgroundColor: '#f5f5f5', 
    paddingBottom: 40 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5'
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16
  },
  header: { 
    backgroundColor: '#0C553C', 
    paddingTop: 50, 
    paddingBottom: 18, 
    paddingHorizontal: 16,
    flexDirection: 'row', 
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  backButton: { 
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 8 
  },
  backButtonText: { 
    color: '#fff', 
    fontWeight: '700',
    marginLeft: 4
  },
  title: { 
    color: '#fff', 
    fontSize: 20, 
    fontWeight: 'bold'
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#0C553C',
    marginBottom: -20,
    paddingBottom: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  photoCircle: { 
    width: 100, 
    height: 100, 
    borderRadius: 50, 
    backgroundColor: '#fff',
    alignItems: 'center', 
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
    marginBottom: 12
  },
  initials: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#0C553C'
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)'
  },
  form: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 20, 
    margin: 16,
    marginTop: 30,
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 3.84, 
    elevation: 3 
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16
  },
  inputGroup: {
    marginBottom: 16
  },
  label: { 
    fontSize: 14, 
    color: '#0C553C', 
    fontWeight: '600', 
    marginBottom: 6
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#ddd', 
    borderRadius: 10, 
    padding: 14, 
    fontSize: 16, 
    backgroundColor: '#f8f8f8',
    color: '#333'
  },
  inputDisabled: {
    backgroundColor: '#eee',
    color: '#888'
  },
  helperText: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
    marginLeft: 4
  },
  saveButton: { 
    backgroundColor: '#0C553C', 
    borderRadius: 10, 
    paddingVertical: 14, 
    marginTop: 8, 
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center'
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc'
  },
  saveButtonText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 16,
    marginLeft: 8
  },
  successMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    padding: 10,
    backgroundColor: '#E8F5E9',
    borderRadius: 8
  },
  successText: {
    color: '#0C553C',
    fontWeight: '600',
    marginLeft: 6
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 24
  },
  securityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 10,
    marginBottom: 12
  },
  securityButtonContent: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  securityButtonText: {
    marginLeft: 12
  },
  securityButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  securityButtonSubtitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 2
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5F5',
    padding: 14,
    borderRadius: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FFCDD2'
  },
  logoutButtonText: {
    color: '#DC3545',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8
  },
  // Estilos del Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  modalBody: {
    padding: 20
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    backgroundColor: '#f8f8f8',
    paddingRight: 12
  },
  passwordInput: {
    flex: 1,
    padding: 14,
    fontSize: 16,
    color: '#333'
  },
  modalSaveButton: {
    backgroundColor: '#0C553C',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20
  },
  modalSaveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  },
  modalCancelButton: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8
  },
  modalCancelButtonText: {
    color: '#666',
    fontSize: 16
  },
  // Estilos de foto de perfil
  profileImageContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  editImageBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#0C553C',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  profileImageHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 12,
  },
  // Estilos del modal de opciones de imagen
  imageOptionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  imageOptionsContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  imageOptionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  imageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#f8f8f8',
    marginBottom: 10,
  },
  imageOptionText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  imageOptionCancel: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
    marginTop: 10,
  },
  imageOptionCancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
});