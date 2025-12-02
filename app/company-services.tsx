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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getServiciosCompletos,
  solicitarServicio,
  cancelarSolicitudServicio,
  ServicioAsignado,
  ServicioDisponible,
  SolicitudServicio,
  getEmpresa,
} from '../services/api';

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
      <View style={styles.servicioHeader}>
        <View style={styles.servicioIconContainer}>
          <Ionicons name="checkmark-circle" size={24} color="#0C553C" />
        </View>
        <View style={styles.servicioInfo}>
          <Text style={styles.servicioNombre}>{servicio.nombre_servicio}</Text>
          <Text style={styles.servicioPrecio}>{formatCurrency(servicio.precio)}</Text>
        </View>
        <View style={styles.activoBadge}>
          <Text style={styles.activoBadgeText}>Activo</Text>
        </View>
      </View>
      <Text style={styles.servicioDescripcion} numberOfLines={2}>
        {servicio.descripcion}
      </Text>
      <View style={styles.servicioStats}>
        <View style={styles.statItem}>
          <Ionicons name="calendar-outline" size={16} color="#666" />
          <Text style={styles.statText}>{servicio.total_reservas || 0} reservas</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="cash-outline" size={16} color="#666" />
          <Text style={styles.statText}>{formatCurrency(Number(servicio.ingresos_generados) || 0)}</Text>
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
        <View style={styles.servicioHeader}>
          <View style={[styles.servicioIconContainer, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="add-circle-outline" size={24} color="#F59E0B" />
          </View>
          <View style={styles.servicioInfo}>
            <Text style={styles.servicioNombre}>{servicio.nombre_servicio}</Text>
            <Text style={styles.servicioPrecio}>{formatCurrency(servicio.precio)}</Text>
          </View>
        </View>
        <Text style={styles.servicioDescripcion} numberOfLines={2}>
          {servicio.descripcion}
        </Text>
        <TouchableOpacity
          style={[
            styles.solicitarBtn,
            tieneSolicitudPendiente && styles.solicitarBtnDisabled,
          ]}
          onPress={() => !tieneSolicitudPendiente && handleSolicitarServicio(servicio)}
          disabled={tieneSolicitudPendiente}
        >
          <Ionicons
            name={tieneSolicitudPendiente ? 'hourglass-outline' : 'paper-plane-outline'}
            size={18}
            color={tieneSolicitudPendiente ? '#9CA3AF' : '#fff'}
          />
          <Text
            style={[
              styles.solicitarBtnText,
              tieneSolicitudPendiente && styles.solicitarBtnTextDisabled,
            ]}
          >
            {tieneSolicitudPendiente ? 'Solicitud Pendiente' : 'Solicitar Servicio'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderSolicitud = (solicitud: SolicitudServicio) => (
    <View key={solicitud.id_solicitud} style={styles.solicitudCard}>
      <View style={styles.solicitudHeader}>
        <View style={styles.servicioInfo}>
          <Text style={styles.servicioNombre}>{solicitud.nombre_servicio}</Text>
          <Text style={styles.solicitudFecha}>
            Solicitado el {formatDate(solicitud.fecha_solicitud)}
          </Text>
        </View>
        <View style={[styles.estadoBadge, { backgroundColor: getEstadoColor(solicitud.estado) + '20' }]}>
          <Text style={[styles.estadoBadgeText, { color: getEstadoColor(solicitud.estado) }]}>
            {getEstadoLabel(solicitud.estado)}
          </Text>
        </View>
      </View>
      
      <View style={styles.solicitudMotivo}>
        <Text style={styles.motivoLabel}>Motivo:</Text>
        <Text style={styles.motivoText}>{solicitud.motivo_solicitud}</Text>
      </View>

      {solicitud.respuesta_admin && (
        <View style={styles.respuestaAdmin}>
          <Text style={styles.respuestaLabel}>Respuesta del administrador:</Text>
          <Text style={styles.respuestaText}>{solicitud.respuesta_admin}</Text>
        </View>
      )}

      {solicitud.estado === 'pendiente' && (
        <TouchableOpacity
          style={styles.cancelarSolicitudBtn}
          onPress={() => handleCancelarSolicitud(solicitud)}
        >
          <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
          <Text style={styles.cancelarSolicitudText}>Cancelar Solicitud</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0C553C" />
        <Text style={styles.loadingText}>Cargando servicios...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F0F4F3' }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Mis Servicios</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'asignados' && styles.tabActive]}
          onPress={() => setActiveTab('asignados')}
        >
          <Ionicons
            name="checkmark-circle"
            size={18}
            color={activeTab === 'asignados' ? '#0C553C' : '#666'}
          />
          <Text style={[styles.tabText, activeTab === 'asignados' && styles.tabTextActive]}>
            Asignados ({serviciosAsignados.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'disponibles' && styles.tabActive]}
          onPress={() => setActiveTab('disponibles')}
        >
          <Ionicons
            name="add-circle"
            size={18}
            color={activeTab === 'disponibles' ? '#0C553C' : '#666'}
          />
          <Text style={[styles.tabText, activeTab === 'disponibles' && styles.tabTextActive]}>
            Disponibles ({serviciosDisponibles.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'solicitudes' && styles.tabActive]}
          onPress={() => setActiveTab('solicitudes')}
        >
          <Ionicons
            name="document-text"
            size={18}
            color={activeTab === 'solicitudes' ? '#0C553C' : '#666'}
          />
          <Text style={[styles.tabText, activeTab === 'solicitudes' && styles.tabTextActive]}>
            Solicitudes ({solicitudes.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0C553C']} />
        }
      >
        {activeTab === 'asignados' && (
          <>
            {serviciosAsignados.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="cube-outline" size={60} color="#ccc" />
                <Text style={styles.emptyText}>No tienes servicios asignados</Text>
                <Text style={styles.emptySubtext}>
                  Solicita nuevos servicios en la pestaña "Disponibles"
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
                <Ionicons name="checkmark-done-circle-outline" size={60} color="#0C553C" />
                <Text style={styles.emptyText}>¡Tienes todos los servicios!</Text>
                <Text style={styles.emptySubtext}>
                  Ya cuentas con todos los servicios disponibles en la plataforma
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.infoBox}>
                  <Ionicons name="information-circle" size={20} color="#0C553C" />
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
                <Ionicons name="document-text-outline" size={60} color="#ccc" />
                <Text style={styles.emptyText}>No tienes solicitudes</Text>
                <Text style={styles.emptySubtext}>
                  Tus solicitudes de nuevos servicios aparecerán aquí
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F4F3',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#0C553C',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
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
    gap: 4,
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#E8F5F0',
  },
  tabText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#0C553C',
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#E8F5F0',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#0C553C',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#0C553C',
    lineHeight: 20,
  },
  servicioCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  servicioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  servicioIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F5F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  servicioInfo: {
    flex: 1,
  },
  servicioNombre: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 2,
  },
  servicioPrecio: {
    fontSize: 14,
    color: '#0C553C',
    fontWeight: '600',
  },
  activoBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activoBadgeText: {
    fontSize: 11,
    color: '#059669',
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
    gap: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F4F3',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  solicitarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0C553C',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  solicitarBtnDisabled: {
    backgroundColor: '#E5E7EB',
  },
  solicitarBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  solicitarBtnTextDisabled: {
    color: '#9CA3AF',
  },
  solicitudCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  solicitudHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  solicitudFecha: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  estadoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  estadoBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  solicitudMotivo: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  motivoLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginBottom: 4,
  },
  motivoText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 20,
  },
  respuestaAdmin: {
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
    marginBottom: 10,
  },
  respuestaLabel: {
    fontSize: 12,
    color: '#1D4ED8',
    fontWeight: '600',
    marginBottom: 4,
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
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
  },
  cancelarSolicitudText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
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
    color: '#333',
  },
  servicioPreview: {
    backgroundColor: '#E8F5F0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  servicioPreviewNombre: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0C553C',
  },
  servicioPreviewPrecio: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0C553C',
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
    borderWidth: 1,
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
    backgroundColor: '#0C553C',
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
