import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getPerfilEmpresa,
  actualizarPerfilBasico,
  actualizarInfoBancaria,
  cambiarContrasenaEmpresa,
  actualizarFotoPerfil,
  eliminarFotoPerfil,
  PerfilEmpresa,
  ActualizarPerfilBasicoData,
  ActualizarInfoBancariaData,
} from '../services/api';

type TabType = 'info' | 'bancario' | 'seguridad';

export default function CompanyProfileScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [perfil, setPerfil] = useState<PerfilEmpresa | null>(null);

  // Estados para edición de información básica
  const [editandoBasico, setEditandoBasico] = useState(false);
  const [formBasico, setFormBasico] = useState<ActualizarPerfilBasicoData>({
    nombre_empresa: '',
    direccion: '',
    telefono: '',
    email: '',
    latitud: null,
    longitud: null,
  });

  // Estados para edición bancaria
  const [editandoBancario, setEditandoBancario] = useState(false);
  const [formBancario, setFormBancario] = useState<ActualizarInfoBancariaData>({});

  // Estados para cambio de contraseña
  const [modalContrasena, setModalContrasena] = useState(false);
  const [contrasenaActual, setContrasenaActual] = useState('');
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [mostrarContrasenas, setMostrarContrasenas] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const fetchPerfil = useCallback(async () => {
    try {
      const response = await getPerfilEmpresa();
      if (response.success && response.data) {
        setPerfil(response.data);
        setFormBasico({
          nombre_empresa: response.data.nombre_empresa,
          direccion: response.data.direccion,
          telefono: response.data.telefono,
          email: response.data.email,
          latitud: response.data.latitud,
          longitud: response.data.longitud,
        });
        setFormBancario({
          titular_cuenta: response.data.titular_cuenta || '',
          tipo_documento_titular: response.data.tipo_documento_titular || '',
          numero_documento_titular: response.data.numero_documento_titular || '',
          banco: response.data.banco || '',
          tipo_cuenta: response.data.tipo_cuenta || '',
          numero_cuenta: response.data.numero_cuenta || '',
          nit_empresa: response.data.nit_empresa || '',
          razon_social: response.data.razon_social || '',
          regimen_tributario: response.data.regimen_tributario || '',
          email_facturacion: response.data.email_facturacion || '',
          telefono_facturacion: response.data.telefono_facturacion || '',
          responsable_pagos: response.data.responsable_pagos || '',
        });
      }
    } catch (error) {
      console.error('Error al obtener perfil:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPerfil();
  }, [fetchPerfil]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPerfil();
  }, [fetchPerfil]);

  const handleSeleccionarFoto = async () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancelar', 'Tomar Foto', 'Elegir de Galería', 'Eliminar Foto'],
          destructiveButtonIndex: 3,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            tomarFoto();
          } else if (buttonIndex === 2) {
            elegirDeGaleria();
          } else if (buttonIndex === 3) {
            handleEliminarFoto();
          }
        }
      );
    } else {
      Alert.alert(
        'Foto de Perfil',
        'Selecciona una opción',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Tomar Foto', onPress: tomarFoto },
          { text: 'Elegir de Galería', onPress: elegirDeGaleria },
          ...(perfil?.profile_image ? [{ text: 'Eliminar Foto', onPress: handleEliminarFoto, style: 'destructive' as const }] : []),
        ]
      );
    }
  };

  const tomarFoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso Denegado', 'Se necesita acceso a la cámara para tomar fotos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await subirFoto(result.assets[0].uri);
    }
  };

  const elegirDeGaleria = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso Denegado', 'Se necesita acceso a la galería para seleccionar fotos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await subirFoto(result.assets[0].uri);
    }
  };

  const subirFoto = async (uri: string) => {
    setUploadingImage(true);
    try {
      const response = await actualizarFotoPerfil(uri);
      if (response.success) {
        Alert.alert('Éxito', 'Foto de perfil actualizada correctamente');
        fetchPerfil();
      } else {
        Alert.alert('Error', response.message || 'No se pudo actualizar la foto');
      }
    } catch (error) {
      Alert.alert('Error', 'Error al subir la foto');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleEliminarFoto = () => {
    Alert.alert(
      'Eliminar Foto',
      '¿Estás seguro de que deseas eliminar tu foto de perfil?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setUploadingImage(true);
            try {
              const response = await eliminarFotoPerfil();
              if (response.success) {
                Alert.alert('Éxito', 'Foto de perfil eliminada');
                fetchPerfil();
              } else {
                Alert.alert('Error', response.message || 'No se pudo eliminar la foto');
              }
            } catch (error) {
              Alert.alert('Error', 'Error al eliminar la foto');
            } finally {
              setUploadingImage(false);
            }
          },
        },
      ]
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  // Constante para la comisión de la plataforma (12%)
  const COMISION_PLATAFORMA = 0.12;

  // Función para calcular el ingreso neto después de la comisión
  const calcularIngresoNeto = (amount: number) => {
    return amount * (1 - COMISION_PLATAFORMA);
  };

  const handleGuardarBasico = async () => {
    if (!formBasico.nombre_empresa || !formBasico.direccion || !formBasico.telefono || !formBasico.email) {
      Alert.alert('Error', 'Todos los campos son obligatorios');
      return;
    }

    setSaving(true);
    try {
      const response = await actualizarPerfilBasico(formBasico);
      if (response.success) {
        Alert.alert('Éxito', 'Información actualizada correctamente');
        setEditandoBasico(false);
        fetchPerfil();
      } else {
        Alert.alert('Error', response.message || 'No se pudo actualizar');
      }
    } catch (error) {
      Alert.alert('Error', 'Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  const handleGuardarBancario = async () => {
    setSaving(true);
    try {
      const response = await actualizarInfoBancaria(formBancario);
      if (response.success) {
        Alert.alert('Éxito', 'Información bancaria actualizada. Pendiente de verificación.');
        setEditandoBancario(false);
        fetchPerfil();
      } else {
        Alert.alert('Error', response.message || 'No se pudo actualizar');
      }
    } catch (error) {
      Alert.alert('Error', 'Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  const handleCambiarContrasena = async () => {
    if (!contrasenaActual || !nuevaContrasena || !confirmarContrasena) {
      Alert.alert('Error', 'Todos los campos son obligatorios');
      return;
    }

    if (nuevaContrasena !== confirmarContrasena) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    if (nuevaContrasena.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setSaving(true);
    try {
      const response = await cambiarContrasenaEmpresa({
        contrasena_actual: contrasenaActual,
        nueva_contrasena: nuevaContrasena,
      });
      if (response.success) {
        Alert.alert('Éxito', 'Contraseña actualizada correctamente');
        setModalContrasena(false);
        setContrasenaActual('');
        setNuevaContrasena('');
        setConfirmarContrasena('');
      } else {
        Alert.alert('Error', response.message || 'No se pudo cambiar la contraseña');
      }
    } catch (error) {
      Alert.alert('Error', 'Error al cambiar la contraseña');
    } finally {
      setSaving(false);
    }
  };

  const renderInfoBasica = () => (
    <View style={styles.section}>
      {/* Sección de Foto de Perfil */}
      <View style={styles.profileImageSection}>
        <TouchableOpacity 
          style={styles.profileImageContainer} 
          onPress={handleSeleccionarFoto}
          disabled={uploadingImage}
        >
          {uploadingImage ? (
            <View style={styles.profileImagePlaceholder}>
              <ActivityIndicator size="large" color="#CC5F2A" />
            </View>
          ) : perfil?.profile_image ? (
            <Image 
              source={{ uri: perfil.profile_image }} 
              style={styles.profileImage}
              contentFit="cover"
            />
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <Ionicons name="business" size={50} color="#CC5F2A" />
            </View>
          )}
          <View style={styles.editImageBadge}>
            <Ionicons name="camera" size={16} color="#fff" />
          </View>
        </TouchableOpacity>
        <Text style={styles.profileImageHint}>Toca para cambiar la foto</Text>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Información del Negocio</Text>
        {!editandoBasico ? (
          <TouchableOpacity style={styles.editButton} onPress={() => setEditandoBasico(true)}>
            <Ionicons name="pencil" size={18} color="#CC5F2A" />
            <Text style={styles.editButtonText}>Editar</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.editActions}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={() => {
                setEditandoBasico(false);
                if (perfil) {
                  setFormBasico({
                    nombre_empresa: perfil.nombre_empresa,
                    direccion: perfil.direccion,
                    telefono: perfil.telefono,
                    email: perfil.email,
                    latitud: perfil.latitud,
                    longitud: perfil.longitud,
                  });
                }
              }}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
              onPress={handleGuardarBasico}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Guardar</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {editandoBasico ? (
        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nombre de la Empresa *</Text>
            <TextInput
              style={styles.input}
              value={formBasico.nombre_empresa}
              onChangeText={(text) => setFormBasico({ ...formBasico, nombre_empresa: text })}
              placeholder="Nombre del negocio"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Dirección *</Text>
            <TextInput
              style={styles.input}
              value={formBasico.direccion}
              onChangeText={(text) => setFormBasico({ ...formBasico, direccion: text })}
              placeholder="Dirección completa"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Teléfono *</Text>
            <TextInput
              style={styles.input}
              value={formBasico.telefono}
              onChangeText={(text) => setFormBasico({ ...formBasico, telefono: text })}
              placeholder="Número de teléfono"
              keyboardType="phone-pad"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email *</Text>
            <TextInput
              style={styles.input}
              value={formBasico.email}
              onChangeText={(text) => setFormBasico({ ...formBasico, email: text })}
              placeholder="correo@ejemplo.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>
      ) : (
        <View style={styles.infoContainer}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="business" size={20} color="#CC5F2A" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Nombre</Text>
              <Text style={styles.infoValue}>{perfil?.nombre_empresa}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="location" size={20} color="#CC5F2A" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Dirección</Text>
              <Text style={styles.infoValue}>{perfil?.direccion}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="call" size={20} color="#CC5F2A" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Teléfono</Text>
              <Text style={styles.infoValue}>{perfil?.telefono}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="mail" size={20} color="#CC5F2A" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{perfil?.email}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="calendar" size={20} color="#CC5F2A" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Registrado desde</Text>
              <Text style={styles.infoValue}>{perfil?.fecha_registro ? formatDate(perfil.fecha_registro) : '-'}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Estadísticas */}
      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>Estadísticas Generales</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="calendar-outline" size={24} color="#CC5F2A" />
            <Text style={styles.statNumber}>{perfil?.estadisticas?.totalReservas || 0}</Text>
            <Text style={styles.statLabel}>Reservas Totales</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="checkmark-circle-outline" size={24} color="#CC5F2A" />
            <Text style={styles.statNumber}>{perfil?.estadisticas?.reservasCompletadas || 0}</Text>
            <Text style={styles.statLabel}>Completadas</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="cash-outline" size={24} color="#CC5F2A" />
            <Text style={styles.statNumberSmall}>{formatCurrency(calcularIngresoNeto(perfil?.estadisticas?.ingresosTotales || 0))}</Text>
            <Text style={styles.statLabel}>Ingresos Netos</Text>
          </View>
        </View>
      </View>

      {/* Badges de verificación */}
      <View style={styles.badgesContainer}>
        <View style={[styles.badge, perfil?.verificada ? styles.badgeSuccess : styles.badgeWarning]}>
          <Ionicons name={perfil?.verificada ? "checkmark-circle" : "time"} size={16} color={perfil?.verificada ? "#059669" : "#d97706"} />
          <Text style={[styles.badgeText, perfil?.verificada ? styles.badgeTextSuccess : styles.badgeTextWarning]}>
            {perfil?.verificada ? 'Empresa Verificada' : 'Pendiente Verificación'}
          </Text>
        </View>
        <View style={[styles.badge, perfil?.is_active ? styles.badgeSuccess : styles.badgeDanger]}>
          <Ionicons name={perfil?.is_active ? "checkmark-circle" : "close-circle"} size={16} color={perfil?.is_active ? "#059669" : "#dc2626"} />
          <Text style={[styles.badgeText, perfil?.is_active ? styles.badgeTextSuccess : styles.badgeTextDanger]}>
            {perfil?.is_active ? 'Cuenta Activa' : 'Cuenta Inactiva'}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderInfoBancaria = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Información Bancaria y Fiscal</Text>
        {!editandoBancario ? (
          <TouchableOpacity style={styles.editButton} onPress={() => setEditandoBancario(true)}>
            <Ionicons name="pencil" size={18} color="#CC5F2A" />
            <Text style={styles.editButtonText}>Editar</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.editActions}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={() => setEditandoBancario(false)}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
              onPress={handleGuardarBancario}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Guardar</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Estado de verificación bancaria */}
      <View style={[styles.verificationBanner, perfil?.datos_bancarios_verificados ? styles.verifiedBanner : styles.pendingBanner]}>
        <Ionicons 
          name={perfil?.datos_bancarios_verificados ? "shield-checkmark" : "shield"} 
          size={24} 
          color={perfil?.datos_bancarios_verificados ? "#059669" : "#d97706"} 
        />
        <View style={styles.verificationText}>
          <Text style={[styles.verificationTitle, perfil?.datos_bancarios_verificados ? styles.verifiedTitle : styles.pendingTitle]}>
            {perfil?.datos_bancarios_verificados ? 'Datos Verificados' : 'Pendiente de Verificación'}
          </Text>
          <Text style={styles.verificationSubtitle}>
            {perfil?.datos_bancarios_verificados 
              ? `Verificado el ${perfil.fecha_verificacion_bancaria ? formatDate(perfil.fecha_verificacion_bancaria) : ''}`
              : 'Los datos serán revisados por un administrador'}
          </Text>
        </View>
      </View>

      {editandoBancario ? (
        <View style={styles.formContainer}>
          <Text style={styles.formSectionTitle}>Datos del Titular</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Titular de la Cuenta</Text>
            <TextInput
              style={styles.input}
              value={formBancario.titular_cuenta}
              onChangeText={(text) => setFormBancario({ ...formBancario, titular_cuenta: text })}
              placeholder="Nombre completo del titular"
            />
          </View>
          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.inputLabel}>Tipo Doc.</Text>
              <TextInput
                style={styles.input}
                value={formBancario.tipo_documento_titular}
                onChangeText={(text) => setFormBancario({ ...formBancario, tipo_documento_titular: text })}
                placeholder="CC/NIT"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 2 }]}>
              <Text style={styles.inputLabel}>Número de Documento</Text>
              <TextInput
                style={styles.input}
                value={formBancario.numero_documento_titular}
                onChangeText={(text) => setFormBancario({ ...formBancario, numero_documento_titular: text })}
                placeholder="Número"
                keyboardType="number-pad"
              />
            </View>
          </View>

          <Text style={[styles.formSectionTitle, { marginTop: 20 }]}>Datos Bancarios</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Banco</Text>
            <TextInput
              style={styles.input}
              value={formBancario.banco}
              onChangeText={(text) => setFormBancario({ ...formBancario, banco: text })}
              placeholder="Nombre del banco"
            />
          </View>
          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.inputLabel}>Tipo Cuenta</Text>
              <TextInput
                style={styles.input}
                value={formBancario.tipo_cuenta}
                onChangeText={(text) => setFormBancario({ ...formBancario, tipo_cuenta: text })}
                placeholder="Ahorros/Corriente"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 2 }]}>
              <Text style={styles.inputLabel}>Número de Cuenta</Text>
              <TextInput
                style={styles.input}
                value={formBancario.numero_cuenta}
                onChangeText={(text) => setFormBancario({ ...formBancario, numero_cuenta: text })}
                placeholder="Número de cuenta"
                keyboardType="number-pad"
              />
            </View>
          </View>

          <Text style={[styles.formSectionTitle, { marginTop: 20 }]}>Información Fiscal</Text>
          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.inputLabel}>NIT</Text>
              <TextInput
                style={styles.input}
                value={formBancario.nit_empresa}
                onChangeText={(text) => setFormBancario({ ...formBancario, nit_empresa: text })}
                placeholder="NIT"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Régimen</Text>
              <TextInput
                style={styles.input}
                value={formBancario.regimen_tributario}
                onChangeText={(text) => setFormBancario({ ...formBancario, regimen_tributario: text })}
                placeholder="Simplificado/Común"
              />
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Razón Social</Text>
            <TextInput
              style={styles.input}
              value={formBancario.razon_social}
              onChangeText={(text) => setFormBancario({ ...formBancario, razon_social: text })}
              placeholder="Razón social de la empresa"
            />
          </View>

          <Text style={[styles.formSectionTitle, { marginTop: 20 }]}>Contacto de Facturación</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Responsable de Pagos</Text>
            <TextInput
              style={styles.input}
              value={formBancario.responsable_pagos}
              onChangeText={(text) => setFormBancario({ ...formBancario, responsable_pagos: text })}
              placeholder="Nombre del responsable"
            />
          </View>
          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.inputLabel}>Email Facturación</Text>
              <TextInput
                style={styles.input}
                value={formBancario.email_facturacion}
                onChangeText={(text) => setFormBancario({ ...formBancario, email_facturacion: text })}
                placeholder="email@ejemplo.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Teléfono</Text>
              <TextInput
                style={styles.input}
                value={formBancario.telefono_facturacion}
                onChangeText={(text) => setFormBancario({ ...formBancario, telefono_facturacion: text })}
                placeholder="Teléfono"
                keyboardType="phone-pad"
              />
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.infoContainer}>
          {/* Datos del titular */}
          <Text style={styles.infoSectionTitle}>Titular de la Cuenta</Text>
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="person" size={20} color="#CC5F2A" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Titular</Text>
              <Text style={styles.infoValue}>{perfil?.titular_cuenta || 'No configurado'}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="card" size={20} color="#CC5F2A" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Documento</Text>
              <Text style={styles.infoValue}>
                {perfil?.tipo_documento_titular && perfil?.numero_documento_titular 
                  ? `${perfil.tipo_documento_titular}: ${perfil.numero_documento_titular}`
                  : 'No configurado'}
              </Text>
            </View>
          </View>

          {/* Datos bancarios */}
          <Text style={[styles.infoSectionTitle, { marginTop: 16 }]}>Cuenta Bancaria</Text>
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="business" size={20} color="#CC5F2A" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Banco</Text>
              <Text style={styles.infoValue}>{perfil?.banco || 'No configurado'}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="wallet" size={20} color="#CC5F2A" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Cuenta</Text>
              <Text style={styles.infoValue}>
                {perfil?.tipo_cuenta && perfil?.numero_cuenta 
                  ? `${perfil.tipo_cuenta}: ****${perfil.numero_cuenta.slice(-4)}`
                  : 'No configurado'}
              </Text>
            </View>
          </View>

          {/* Datos fiscales */}
          <Text style={[styles.infoSectionTitle, { marginTop: 16 }]}>Información Fiscal</Text>
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="document-text" size={20} color="#CC5F2A" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>NIT</Text>
              <Text style={styles.infoValue}>{perfil?.nit_empresa || 'No configurado'}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="briefcase" size={20} color="#CC5F2A" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Razón Social</Text>
              <Text style={styles.infoValue}>{perfil?.razon_social || 'No configurado'}</Text>
            </View>
          </View>

          {/* Contacto facturación */}
          <Text style={[styles.infoSectionTitle, { marginTop: 16 }]}>Contacto de Facturación</Text>
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="person" size={20} color="#CC5F2A" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Responsable</Text>
              <Text style={styles.infoValue}>{perfil?.responsable_pagos || 'No configurado'}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="mail" size={20} color="#CC5F2A" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{perfil?.email_facturacion || 'No configurado'}</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );

  const renderSeguridad = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Seguridad de la Cuenta</Text>

      <TouchableOpacity style={styles.securityItem} onPress={() => setModalContrasena(true)}>
        <View style={styles.securityIconContainer}>
          <Ionicons name="key" size={24} color="#CC5F2A" />
        </View>
        <View style={styles.securityContent}>
          <Text style={styles.securityTitle}>Cambiar Contraseña</Text>
          <Text style={styles.securityDescription}>Actualiza tu contraseña de acceso</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#ccc" />
      </TouchableOpacity>

      <View style={styles.securityItem}>
        <View style={styles.securityIconContainer}>
          <Ionicons name="shield-checkmark" size={24} color="#CC5F2A" />
        </View>
        <View style={styles.securityContent}>
          <Text style={styles.securityTitle}>Estado de la Cuenta</Text>
          <Text style={styles.securityDescription}>
            {perfil?.is_active ? 'Tu cuenta está activa y funcionando' : 'Tu cuenta está desactivada'}
          </Text>
        </View>
        <View style={[styles.statusDot, perfil?.is_active ? styles.statusActive : styles.statusInactive]} />
      </View>

      <View style={styles.securityItem}>
        <View style={styles.securityIconContainer}>
          <Ionicons name="checkmark-circle" size={24} color="#CC5F2A" />
        </View>
        <View style={styles.securityContent}>
          <Text style={styles.securityTitle}>Verificación de Empresa</Text>
          <Text style={styles.securityDescription}>
            {perfil?.verificada ? 'Tu empresa ha sido verificada' : 'Verificación pendiente por el administrador'}
          </Text>
        </View>
        <View style={[styles.statusDot, perfil?.verificada ? styles.statusActive : styles.statusPending]} />
      </View>

      <View style={styles.helpBox}>
        <Ionicons name="help-circle-outline" size={24} color="#CC5F2A" />
        <View style={styles.helpContent}>
          <Text style={styles.helpTitle}>¿Necesitas ayuda?</Text>
          <Text style={styles.helpDescription}>
            Si tienes problemas con tu cuenta o necesitas asistencia, contacta al administrador del sistema.
          </Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#CC5F2A" />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={{ flex: 1, backgroundColor: '#FFF8F5' }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Mi Perfil</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'info' && styles.tabActive]}
            onPress={() => setActiveTab('info')}
          >
            <Ionicons name="business" size={18} color={activeTab === 'info' ? '#CC5F2A' : '#666'} />
            <Text style={[styles.tabText, activeTab === 'info' && styles.tabTextActive]}>Información</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'bancario' && styles.tabActive]}
            onPress={() => setActiveTab('bancario')}
          >
            <Ionicons name="wallet" size={18} color={activeTab === 'bancario' ? '#CC5F2A' : '#666'} />
            <Text style={[styles.tabText, activeTab === 'bancario' && styles.tabTextActive]}>Bancario</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'seguridad' && styles.tabActive]}
            onPress={() => setActiveTab('seguridad')}
          >
            <Ionicons name="shield" size={18} color={activeTab === 'seguridad' ? '#CC5F2A' : '#666'} />
            <Text style={[styles.tabText, activeTab === 'seguridad' && styles.tabTextActive]}>Seguridad</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#CC5F2A']} />
          }
        >
          {activeTab === 'info' && renderInfoBasica()}
          {activeTab === 'bancario' && renderInfoBancaria()}
          {activeTab === 'seguridad' && renderSeguridad()}
        </ScrollView>

        {/* Modal Cambiar Contraseña */}
        <Modal
          visible={modalContrasena}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setModalContrasena(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Cambiar Contraseña</Text>
                <TouchableOpacity onPress={() => setModalContrasena(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Contraseña Actual</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    value={contrasenaActual}
                    onChangeText={setContrasenaActual}
                    placeholder="Ingresa tu contraseña actual"
                    secureTextEntry={!mostrarContrasenas}
                  />
                  <TouchableOpacity onPress={() => setMostrarContrasenas(!mostrarContrasenas)}>
                    <Ionicons name={mostrarContrasenas ? "eye-off" : "eye"} size={24} color="#666" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nueva Contraseña</Text>
                <TextInput
                  style={styles.input}
                  value={nuevaContrasena}
                  onChangeText={setNuevaContrasena}
                  placeholder="Mínimo 6 caracteres"
                  secureTextEntry={!mostrarContrasenas}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirmar Nueva Contraseña</Text>
                <TextInput
                  style={styles.input}
                  value={confirmarContrasena}
                  onChangeText={setConfirmarContrasena}
                  placeholder="Repite la nueva contraseña"
                  secureTextEntry={!mostrarContrasenas}
                />
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
                onPress={handleCambiarContrasena}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="key" size={20} color="#fff" />
                    <Text style={styles.submitBtnText}>Cambiar Contraseña</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF8F5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#CC5F2A',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#CC5F2A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  headerSpacer: {
    width: 85,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: 'rgba(204, 95, 42, 0.1)',
  },
  tabText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#CC5F2A',
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  profileImageSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F3',
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#CC5F2A',
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(204, 95, 42, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#CC5F2A',
    borderStyle: 'dashed',
  },
  editImageBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#CC5F2A',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  profileImageHint: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(204, 95, 42, 0.1)',
  },
  editButtonText: {
    color: '#CC5F2A',
    fontWeight: '600',
    fontSize: 14,
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 14,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#CC5F2A',
    minWidth: 80,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  formContainer: {
    marginTop: 8,
  },
  formSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#CC5F2A',
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
  },
  infoContainer: {
    marginTop: 8,
  },
  infoSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#CC5F2A',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F3',
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(204, 95, 42, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  statsContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F4F3',
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginTop: 6,
  },
  statNumberSmall: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
    marginTop: 6,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
    textAlign: 'center',
  },
  statSubLabel: {
    fontSize: 9,
    color: '#CC5F2A',
    marginTop: 1,
    textAlign: 'center',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 50,
    backgroundColor: '#E5E7EB',
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeSuccess: {
    backgroundColor: '#D1FAE5',
  },
  badgeWarning: {
    backgroundColor: '#FEF3C7',
  },
  badgeDanger: {
    backgroundColor: '#FEE2E2',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgeTextSuccess: {
    color: '#059669',
  },
  badgeTextWarning: {
    color: '#d97706',
  },
  badgeTextDanger: {
    color: '#dc2626',
  },
  verificationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  verifiedBanner: {
    backgroundColor: '#D1FAE5',
  },
  pendingBanner: {
    backgroundColor: '#FEF3C7',
  },
  verificationText: {
    flex: 1,
  },
  verificationTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  verifiedTitle: {
    color: '#059669',
  },
  pendingTitle: {
    color: '#d97706',
  },
  verificationSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  securityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F3',
  },
  securityIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(204, 95, 42, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  securityContent: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  securityDescription: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: '#10b981',
  },
  statusInactive: {
    backgroundColor: '#ef4444',
  },
  statusPending: {
    backgroundColor: '#f59e0b',
  },
  helpBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'rgba(204, 95, 42, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  helpContent: {
    flex: 1,
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#CC5F2A',
    marginBottom: 4,
  },
  helpDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F3',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingRight: 12,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#CC5F2A',
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 16,
  },
  submitBtnDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
