import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  getServiciosCompletos,
  solicitarServicio,
  cancelarSolicitudServicio,
  ServicioAsignado,
  ServicioDisponible,
  SolicitudServicio,
  getEmpresa,
} from '../services/api';

const { width } = Dimensions.get('window');
type TabType = 'asignados' | 'disponibles' | 'solicitudes';

export default function CompanyServicesScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('asignados');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [serviciosAsignados, setServiciosAsignados] = useState<ServicioAsignado[]>([]);
  const [serviciosDisponibles, setServiciosDisponibles] = useState<ServicioDisponible[]>([]);
  const [solicitudes, setSolicitudes] = useState<SolicitudServicio[]>([]);
  const [empresaNombre, setEmpresaNombre] = useState('');
  
  // Modal de solicitud
  const [modalVisible, setModalVisible] = useState(false);
  const [servicioSeleccionado, setServicioSeleccionado] = useState<ServicioDisponible | null>(null);
  const [motivo, setMotivo] = useState('');
  const [usuarioResponsable, setUsuarioResponsable] = useState('');
  const [telefonoContacto, setTelefonoContacto] = useState('');
  const [enviandoSolicitud, setEnviandoSolicitud] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const empresa = await getEmpresa();
      if (empresa) {
        setEmpresaNombre(empresa.nombre_empresa);
      }

      const response = await getServiciosCompletos();
      if (response.success && response.data) {
        setServiciosAsignados(response.data.serviciosAsignados);
        setServiciosDisponibles(response.data.serviciosDisponibles);
        setSolicitudes(response.data.solicitudesPendientes);
      }
    } catch (error) {
      console.error('Error al obtener servicios:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

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
      month: 'short',
      year: 'numeric',
    });
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return '#f59e0b';
      case 'aprobada':
        return '#10b981';
      case 'rechazada':
        return '#ef4444';
      case 'en_revision':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  };

  const getEstadoLabel = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'Pendiente';
      case 'aprobada':
        return 'Aprobada';
      case 'rechazada':
        return 'Rechazada';
      case 'en_revision':
        return 'En Revisión';
      default:
        return estado;
    }
  };

  const handleSolicitarServicio = (servicio: ServicioDisponible) => {
    setServicioSeleccionado(servicio);
    setMotivo('');
    setUsuarioResponsable('');
    setTelefonoContacto('');
    setModalVisible(true);
  };

  const enviarSolicitud = async () => {
    if (!servicioSeleccionado) return;

    if (!motivo.trim() || !usuarioResponsable.trim() || !telefonoContacto.trim()) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    setEnviandoSolicitud(true);
    try {
      const response = await solicitarServicio({
        servicioId: servicioSeleccionado.id_servicio,
        motivo: motivo.trim(),
        usuarioResponsable: usuarioResponsable.trim(),
        telefonoContacto: telefonoContacto.trim(),
      });

      if (response.success) {
        Alert.alert('Éxito', response.message || 'Solicitud enviada correctamente');
        setModalVisible(false);
        fetchData();
      } else {
        Alert.alert('Error', response.message || 'No se pudo enviar la solicitud');
      }
    } catch (error) {
      Alert.alert('Error', 'Error al enviar la solicitud');
    } finally {
      setEnviandoSolicitud(false);
    }
  };

  const handleCancelarSolicitud = (solicitud: SolicitudServicio) => {
    Alert.alert(
      'Cancelar Solicitud',
      `¿Estás seguro de cancelar la solicitud para "${solicitud.nombre_servicio}"?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await cancelarSolicitudServicio(solicitud.id_solicitud);
              if (response.success) {
                Alert.alert('Éxito', 'Solicitud cancelada correctamente');
                fetchData();
              } else {
                Alert.alert('Error', response.message || 'No se pudo cancelar la solicitud');
              }
            } catch (error) {
              Alert.alert('Error', 'Error al cancelar la solicitud');
            }
          },
        },
      ]
    );
  };

  const renderServicioAsignado = (servicio: ServicioAsignado) => (
    <View key={servicio.id_servicio} style={styles.servicioCard}>
      {/* Barra de estado superior */}
      <LinearGradient
        colors={['#FF6B35', '#FF8E53']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.cardStatusBar}
      />
      
      <View style={styles.cardContent}>
        <View style={styles.servicioHeader}>
          <View style={styles.servicioIconContainer}>
            <LinearGradient
              colors={['#FF6B35', '#FF8E53']}
              style={styles.servicioIconGradient}
            >
              <Ionicons name="checkmark-circle" size={24} color="#fff" />
            </LinearGradient>
          </View>
          <View style={styles.servicioInfo}>
            <Text style={styles.servicioNombre}>{servicio.nombre_servicio}</Text>
            <Text style={styles.servicioPrecio}>{formatCurrency(servicio.precio)}</Text>
          </View>
          <View style={styles.activoBadge}>
            <Ionicons name="shield-checkmark" size={12} color="#FF6B35" />
            <Text style={styles.activoBadgeText}>Activo</Text>
          </View>
        </View>
        
        <Text style={styles.servicioDescripcion} numberOfLines={2}>
          {servicio.descripcion}
        </Text>
        
        <View style={styles.servicioStats}>
          <View style={styles.statItem}>
            <View style={styles.statIconContainer}>
              <Ionicons name="calendar-outline" size={14} color="#FF6B35" />
            </View>
            <View>
              <Text style={styles.statValue}>{servicio.total_reservas || 0}</Text>
              <Text style={styles.statLabel}>Reservas</Text>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={styles.statIconContainer}>
              <Ionicons name="cash-outline" size={14} color="#FFB347" />
            </View>
            <View>
              <Text style={styles.statValue}>{formatCurrency(Number(servicio.ingresos_generados) || 0)}</Text>
              <Text style={styles.statLabel}>Ingresos</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  const renderServicioDisponible = (servicio: ServicioDisponible) => {
    // Verificar si ya hay una solicitud pendiente para este servicio
    const tieneSolicitudPendiente = solicitudes.some(
      (s) => s.id_servicio === servicio.id_servicio && s.estado === 'pendiente'
    );

    return (
      <View key={servicio.id_servicio} style={styles.servicioCard}>
        {/* Barra de estado superior */}
        <LinearGradient
          colors={['#FFB347', '#FF8E53']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.cardStatusBar}
        />
        
        <View style={styles.cardContent}>
          <View style={styles.servicioHeader}>
            <View style={styles.servicioIconContainer}>
              <LinearGradient
                colors={['#FFB347', '#FF8E53']}
                style={styles.servicioIconGradient}
              >
                <Ionicons name="add-circle" size={24} color="#fff" />
              </LinearGradient>
            </View>
            <View style={styles.servicioInfo}>
              <Text style={styles.servicioNombre}>{servicio.nombre_servicio}</Text>
              <Text style={styles.servicioPrecio}>{formatCurrency(servicio.precio)}</Text>
            </View>
            {tieneSolicitudPendiente && (
              <View style={styles.pendingBadge}>
                <Ionicons name="hourglass" size={12} color="#FF8E53" />
                <Text style={styles.pendingBadgeText}>Pendiente</Text>
              </View>
            )}
          </View>
          
          <Text style={styles.servicioDescripcion} numberOfLines={2}>
            {servicio.descripcion}
          </Text>
          
          <TouchableOpacity
            style={[styles.solicitarBtn, tieneSolicitudPendiente && styles.solicitarBtnDisabled]}
            onPress={() => !tieneSolicitudPendiente && handleSolicitarServicio(servicio)}
            disabled={tieneSolicitudPendiente}
            activeOpacity={0.8}
          >
            {tieneSolicitudPendiente ? (
              <View style={styles.solicitarBtnContent}>
                <Ionicons name="hourglass-outline" size={18} color="#9CA3AF" />
                <Text style={styles.solicitarBtnTextDisabled}>Solicitud en Proceso</Text>
              </View>
            ) : (
              <LinearGradient
                colors={['#FF6B35', '#FF8E53']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.solicitarBtnGradient}
              >
                <Ionicons name="paper-plane" size={18} color="#fff" />
                <Text style={styles.solicitarBtnText}>Solicitar Servicio</Text>
              </LinearGradient>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderSolicitud = (solicitud: SolicitudServicio) => {
    const estadoConfig = {
      pendiente: { colors: ['#f59e0b', '#d97706'], icon: 'hourglass' },
      aprobada: { colors: ['#10b981', '#059669'], icon: 'checkmark-circle' },
      rechazada: { colors: ['#ef4444', '#dc2626'], icon: 'close-circle' },
      en_revision: { colors: ['#3b82f6', '#2563eb'], icon: 'eye' },
    };
    const config = estadoConfig[solicitud.estado as keyof typeof estadoConfig] || estadoConfig.pendiente;

    return (
      <View key={solicitud.id_solicitud} style={styles.solicitudCard}>
        {/* Barra de estado superior */}
        <LinearGradient
          colors={config.colors as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.cardStatusBar}
        />
        
        <View style={styles.cardContent}>
          <View style={styles.solicitudHeader}>
            <View style={styles.servicioInfo}>
              <Text style={styles.servicioNombre}>{solicitud.nombre_servicio}</Text>
              <View style={styles.fechaContainer}>
                <Ionicons name="calendar-outline" size={12} color="#888" />
                <Text style={styles.solicitudFecha}>
                  Solicitado el {formatDate(solicitud.fecha_solicitud)}
                </Text>
              </View>
            </View>
            <View style={[styles.estadoBadge, { backgroundColor: config.colors[0] + '20' }]}>
              <Ionicons name={config.icon as any} size={12} color={config.colors[0]} />
              <Text style={[styles.estadoBadgeText, { color: config.colors[0] }]}>
                {getEstadoLabel(solicitud.estado)}
              </Text>
            </View>
          </View>
          
          <View style={styles.solicitudMotivo}>
            <View style={styles.motivoHeader}>
              <Ionicons name="chatbubble-outline" size={14} color="#666" />
              <Text style={styles.motivoLabel}>Motivo de solicitud</Text>
            </View>
            <Text style={styles.motivoText}>{solicitud.motivo_solicitud}</Text>
          </View>

          {solicitud.respuesta_admin && solicitud.respuesta_admin.trim() !== '' && (
            <View style={styles.respuestaAdmin}>
              <View style={styles.respuestaHeader}>
                <Ionicons name="shield-checkmark" size={14} color="#3B82F6" />
                <Text style={styles.respuestaLabel}>Respuesta del administrador</Text>
              </View>
              <Text style={styles.respuestaText}>{solicitud.respuesta_admin}</Text>
            </View>
          )}

          {solicitud.estado === 'pendiente' && (
            <TouchableOpacity
              style={styles.cancelarSolicitudBtn}
              onPress={() => handleCancelarSolicitud(solicitud)}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle" size={18} color="#EF4444" />
              <Text style={styles.cancelarSolicitudText}>Cancelar Solicitud</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={['#FF6B35', '#FF8E53', '#FFB347']}
          style={styles.loadingGradient}
        >
          <View style={styles.loadingContent}>
            <View style={styles.loadingIconContainer}>
              <Ionicons name="cube" size={40} color="#fff" />
            </View>
            <ActivityIndicator size="large" color="#fff" style={{ marginTop: 20 }} />
            <Text style={styles.loadingText}>Cargando servicios...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  // Calcular estadísticas
  const totalIngresos = serviciosAsignados.reduce((acc, s) => acc + (Number(s.ingresos_generados) || 0), 0);
  const totalReservas = serviciosAsignados.reduce((acc, s) => acc + (s.total_reservas || 0), 0);
  const solicitudesPendientes = solicitudes.filter(s => s.estado === 'pendiente').length;

  return (
    <View style={{ flex: 1, backgroundColor: '#FFF8F5' }}>
      {/* Header Premium con Gradiente */}
      <LinearGradient
        colors={['#FF6B35', '#FF8E53', '#FFB347']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        {/* Decoraciones de fondo */}
        <View style={styles.headerDecoration1} />
        <View style={styles.headerDecoration2} />
        <View style={styles.headerDecoration3} />
        
        {/* Contenido del header */}
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <View style={styles.backButtonCircle}>
                <Ionicons name="arrow-back" size={20} color="#FF6B35" />
              </View>
            </TouchableOpacity>
            
            <View style={styles.headerTitleContainer}>
              <View style={styles.headerIconBadge}>
                <Ionicons name="cube" size={22} color="#fff" />
              </View>
              <View>
                <Text style={styles.headerSubtitle}>Gestión de</Text>
                <Text style={styles.title}>Servicios</Text>
              </View>
            </View>
            
            <View style={styles.headerSpacer} />
          </View>

          {/* Mini Stats en Header */}
          <View style={styles.miniStatsContainer}>
            <View style={styles.miniStatItem}>
              <View style={styles.miniStatIcon}>
                <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              </View>
              <View>
                <Text style={styles.miniStatValue}>{serviciosAsignados.length}</Text>
                <Text style={styles.miniStatLabel}>Activos</Text>
              </View>
            </View>
            <View style={styles.miniStatDivider} />
            <View style={styles.miniStatItem}>
              <View style={styles.miniStatIcon}>
                <Ionicons name="calendar" size={16} color="#3b82f6" />
              </View>
              <View>
                <Text style={styles.miniStatValue}>{totalReservas}</Text>
                <Text style={styles.miniStatLabel}>Reservas</Text>
              </View>
            </View>
            <View style={styles.miniStatDivider} />
            <View style={styles.miniStatItem}>
              <View style={styles.miniStatIcon}>
                <Ionicons name="cash" size={16} color="#f59e0b" />
              </View>
              <View>
                <Text style={styles.miniStatValue}>{formatCurrency(totalIngresos).replace('COP', '').trim()}</Text>
                <Text style={styles.miniStatLabel}>Ingresos</Text>
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Tabs Mejorados */}
      <View style={styles.tabWrapper}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScrollContent}
        >
          <TouchableOpacity
            style={[styles.tab, activeTab === 'asignados' && styles.tabActive]}
            onPress={() => setActiveTab('asignados')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={activeTab === 'asignados' ? ['#FF6B35', '#FF8E53'] : ['#fff', '#fff']}
              style={styles.tabGradient}
            >
              <View style={[styles.tabIconContainer, activeTab === 'asignados' && styles.tabIconContainerActive]}>
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={activeTab === 'asignados' ? '#fff' : '#FF6B35'}
                />
              </View>
              <Text style={[styles.tabText, activeTab === 'asignados' && styles.tabTextActive]}>
                Asignados
              </Text>
              <View style={[styles.tabBadge, activeTab === 'asignados' && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, activeTab === 'asignados' && styles.tabBadgeTextActive]}>
                  {serviciosAsignados.length}
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'disponibles' && styles.tabActive]}
            onPress={() => setActiveTab('disponibles')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={activeTab === 'disponibles' ? ['#FF6B35', '#FF8E53'] : ['#fff', '#fff']}
              style={styles.tabGradient}
            >
              <View style={[styles.tabIconContainer, activeTab === 'disponibles' && styles.tabIconContainerActive]}>
                <Ionicons
                  name="add-circle"
                  size={18}
                  color={activeTab === 'disponibles' ? '#fff' : '#FFB347'}
                />
              </View>
              <Text style={[styles.tabText, activeTab === 'disponibles' && styles.tabTextActive]}>
                Disponibles
              </Text>
              <View style={[styles.tabBadge, activeTab === 'disponibles' && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, activeTab === 'disponibles' && styles.tabBadgeTextActive]}>
                  {serviciosDisponibles.length}
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'solicitudes' && styles.tabActive]}
            onPress={() => setActiveTab('solicitudes')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={activeTab === 'solicitudes' ? ['#FF6B35', '#FF8E53'] : ['#fff', '#fff']}
              style={styles.tabGradient}
            >
              <View style={[styles.tabIconContainer, activeTab === 'solicitudes' && styles.tabIconContainerActive]}>
                <Ionicons
                  name="document-text"
                  size={18}
                  color={activeTab === 'solicitudes' ? '#fff' : '#FF6B35'}
                />
              </View>
              <Text style={[styles.tabText, activeTab === 'solicitudes' && styles.tabTextActive]}>
                Solicitudes
              </Text>
              {solicitudesPendientes > 0 && (
                <View style={[styles.tabBadge, styles.tabBadgePending]}>
                  <Text style={styles.tabBadgeTextPending}>{solicitudesPendientes}</Text>
                </View>
              )}
              {solicitudesPendientes === 0 && (
                <View style={[styles.tabBadge, activeTab === 'solicitudes' && styles.tabBadgeActive]}>
                  <Text style={[styles.tabBadgeText, activeTab === 'solicitudes' && styles.tabBadgeTextActive]}>
                    {solicitudes.length}
                  </Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF6B35']} />
        }
      >
        {activeTab === 'asignados' && (
          <>
            {serviciosAsignados.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconContainer}>
                  <Ionicons name="cube-outline" size={50} color="#9CA3AF" />
                </View>
                <Text style={styles.emptyText}>No tienes servicios asignados</Text>
                <Text style={styles.emptySubtext}>
                  Solicita nuevos servicios en la pestaña "Disponibles" para comenzar a ofrecer más opciones a tus clientes
                </Text>
              </View>
            ) : (
              serviciosAsignados.map(renderServicioAsignado)
            )}
          </>
        )}

        {activeTab === 'disponibles' && (
          <>
            {serviciosDisponibles.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIconContainer, { backgroundColor: '#D1FAE5' }]}>
                  <Ionicons name="checkmark-done-circle" size={50} color="#10b981" />
                </View>
                <Text style={styles.emptyText}>¡Tienes todos los servicios!</Text>
                <Text style={styles.emptySubtext}>
                  Ya cuentas con todos los servicios disponibles en la plataforma. Excelente trabajo.
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.infoBox}>
                  <Ionicons name="information-circle" size={20} color="#FF6B35" />
                  <Text style={styles.infoText}>
                    Solicita nuevos servicios para ampliar tu oferta. Las solicitudes serán
                    revisadas por el administrador.
                  </Text>
                </View>
                {serviciosDisponibles.map(renderServicioDisponible)}
              </>
            )}
          </>
        )}

        {activeTab === 'solicitudes' && (
          <>
            {solicitudes.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIconContainer, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="document-text" size={50} color="#3b82f6" />
                </View>
                <Text style={styles.emptyText}>No tienes solicitudes</Text>
                <Text style={styles.emptySubtext}>
                  Cuando solicites nuevos servicios, el estado de tus solicitudes aparecerá aquí
                </Text>
              </View>
            ) : (
              solicitudes.map(renderSolicitud)
            )}
          </>
        )}
      </ScrollView>

      {/* Modal de Solicitud */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Solicitar Servicio</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {servicioSeleccionado && (
              <View style={styles.servicioPreview}>
                <Text style={styles.servicioPreviewNombre}>
                  {servicioSeleccionado.nombre_servicio}
                </Text>
                <Text style={styles.servicioPreviewPrecio}>
                  {formatCurrency(servicioSeleccionado.precio)}
                </Text>
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.label}>Motivo de la solicitud *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Explica por qué necesitas este servicio..."
                value={motivo}
                onChangeText={setMotivo}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Persona responsable *</Text>
              <TextInput
                style={styles.input}
                placeholder="Nombre del responsable"
                value={usuarioResponsable}
                onChangeText={setUsuarioResponsable}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Teléfono de contacto *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: 3001234567"
                value={telefonoContacto}
                onChangeText={setTelefonoContacto}
                keyboardType="phone-pad"
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, enviandoSolicitud && styles.submitBtnDisabled]}
              onPress={enviarSolicitud}
              disabled={enviandoSolicitud}
            >
              {enviandoSolicitud ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="send" size={20} color="#fff" />
                  <Text style={styles.submitBtnText}>Enviar Solicitud</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // Loading
  loadingContainer: {
    flex: 1,
  },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },

  // Header Premium
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  headerDecoration1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  headerDecoration2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  headerDecoration3: {
    position: 'absolute',
    top: 40,
    right: 80,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  headerContent: {
    zIndex: 1,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    marginRight: 12,
  },
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  headerIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  headerSpacer: {
    width: 40,
  },

  // Mini Stats en Header
  miniStatsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 12,
    marginTop: 8,
  },
  miniStatItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniStatIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniStatValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  miniStatLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  miniStatDivider: {
    width: 1,
    height: '70%',
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 8,
  },

  // Tabs
  tabWrapper: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabScrollContent: {
    paddingHorizontal: 12,
    gap: 10,
  },
  tab: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabActive: {},
  tabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tabIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabIconContainerActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  tabText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  tabBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF6B35',
  },
  tabBadgeTextActive: {
    color: '#fff',
  },
  tabBadgePending: {
    backgroundColor: '#FEF3C7',
  },
  tabBadgeTextPending: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },

  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },

  // Info Box
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#FF6B35',
    lineHeight: 20,
  },

  // Tarjetas de Servicio
  servicioCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  cardStatusBar: {
    height: 4,
  },
  cardContent: {
    padding: 16,
  },
  servicioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  servicioIconContainer: {
    marginRight: 12,
  },
  servicioIconGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  servicioInfo: {
    flex: 1,
  },
  servicioNombre: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  servicioPrecio: {
    fontSize: 15,
    color: '#FF6B35',
    fontWeight: '700',
  },
  activoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  activoBadgeText: {
    fontSize: 11,
    color: '#FF6B35',
    fontWeight: '700',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 179, 71, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pendingBadgeText: {
    fontSize: 11,
    color: '#FF8E53',
    fontWeight: '700',
  },
  servicioDescripcion: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  servicioStats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F4F3',
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  statLabel: {
    fontSize: 10,
    color: '#888',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },

  // Botón Solicitar
  solicitarBtn: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  solicitarBtnDisabled: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 14,
  },
  solicitarBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  solicitarBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  solicitarBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  solicitarBtnTextDisabled: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Tarjetas de Solicitud
  solicitudCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  solicitudHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  fechaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  solicitudFecha: {
    fontSize: 12,
    color: '#888',
  },
  estadoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  estadoBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  solicitudMotivo: {
    backgroundColor: '#F9FAFB',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  motivoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  motivoLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  motivoText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 20,
  },
  respuestaAdmin: {
    backgroundColor: '#EFF6FF',
    padding: 14,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
    marginBottom: 10,
  },
  respuestaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  respuestaLabel: {
    fontSize: 12,
    color: '#1D4ED8',
    fontWeight: '600',
  },
  respuestaText: {
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 20,
  },
  cancelarSolicitudBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: '#FEE2E2',
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
  },
  cancelarSolicitudText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F3',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  servicioPreview: {
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    padding: 16,
    borderRadius: 14,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  servicioPreviewNombre: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF6B35',
  },
  servicioPreviewPrecio: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF6B35',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#333',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 10,
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
