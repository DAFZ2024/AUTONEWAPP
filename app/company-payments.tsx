import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Modal, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  getMisReservasPagos,
  MisReservasPagosResponse,
  MisReservasPagosStats,
  ReservaPago
} from '@/services/api';

type TabType = 'pendientes' | 'pagadas';

export default function CompanyPayments() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('pendientes');
  const [error, setError] = useState<string | null>(null);
  
  // Datos
  const [reservas, setReservas] = useState<ReservaPago[]>([]);
  const [stats, setStats] = useState<MisReservasPagosStats | null>(null);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Modal de detalle
  const [modalVisible, setModalVisible] = useState(false);
  const [reservaDetalle, setReservaDetalle] = useState<ReservaPago | null>(null);

  const fetchData = async (page: number = 1, append: boolean = false) => {
    try {
      if (!append) setError(null);
      
      console.log('[PAGOS] Fetching pagos, tab:', activeTab, 'page:', page);
      const response = await getMisReservasPagos(activeTab, undefined, undefined, page);
      console.log('[PAGOS] Response:', JSON.stringify(response, null, 2));

      if (response.success && response.data) {
        const data = response.data;
        console.log('[PAGOS] Data received, reservas count:', data.reservas?.length);
        if (append) {
          setReservas(prev => [...prev, ...data.reservas]);
        } else {
          setReservas(data.reservas);
        }
        setStats(data.stats);
        setPagination({
          page: data.pagination.page,
          totalPages: data.pagination.totalPages,
          total: data.pagination.total
        });
      } else {
        console.log('[PAGOS] Error in response:', response.message);
        setError(response.message || 'Error al cargar los pagos');
      }

    } catch (err) {
      console.error('[PAGOS] Error fetching payments:', err);
      setError('Error al cargar la información de pagos');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchData(1, false);
  }, [activeTab]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(1, false);
  }, [activeTab]);

  const loadMore = () => {
    if (loadingMore || pagination.page >= pagination.totalPages) return;
    setLoadingMore(true);
    fetchData(pagination.page + 1, true);
  };

  const handleVerDetalle = (reserva: ReservaPago) => {
    setReservaDetalle(reserva);
    setModalVisible(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (timeStr: string) => {
    return timeStr?.substring(0, 5) || '';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Cargando pagos...</Text>
      </View>
    );
  }

  const renderReservaItem = ({ item }: { item: ReservaPago }) => (
    <TouchableOpacity 
      style={styles.reservaCard}
      onPress={() => handleVerDetalle(item)}
      activeOpacity={0.7}
    >
      {/* Header con número y estado */}
      <View style={styles.reservaHeader}>
        <View style={styles.reservaNumeroContainer}>
          <Text style={styles.reservaNumero}>#{item.numero_reserva}</Text>
          <View style={[
            styles.estadoBadge,
            { backgroundColor: activeTab === 'pendientes' ? '#FFF3CD' : '#D4EDDA' }
          ]}>
            <Text style={[
              styles.estadoBadgeText,
              { color: activeTab === 'pendientes' ? '#856404' : '#155724' }
            ]}>
              {activeTab === 'pendientes' ? 'Pendiente' : 'Pagado'}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      </View>

      {/* Info del cliente y fecha */}
      <View style={styles.reservaInfo}>
        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={14} color="#666" />
          <Text style={styles.infoText}>{item.cliente}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={14} color="#666" />
          <Text style={styles.infoText}>{formatDate(item.fecha)} • {formatTime(item.hora)}</Text>
        </View>
        {item.servicios && item.servicios.length > 0 && (
          <View style={styles.infoRow}>
            <Ionicons name="car-outline" size={14} color="#666" />
            <Text style={styles.infoText} numberOfLines={1}>
              {item.servicios.filter(s => s.nombre).map(s => s.nombre).join(', ')}
            </Text>
          </View>
        )}
      </View>

      {/* Desglose de valores */}
      <View style={styles.reservaMontos}>
        <View style={styles.montoRow}>
          <Text style={styles.montoLabel}>Valor servicio:</Text>
          <Text style={styles.montoValue}>{formatCurrency(item.total_original)}</Text>
        </View>
        <View style={styles.montoRow}>
          <Text style={styles.montoLabel}>Comisión (12%):</Text>
          <Text style={[styles.montoValue, styles.montoComision]}>-{formatCurrency(item.comision_plataforma)}</Text>
        </View>
        <View style={[styles.montoRow, styles.montoRowTotal]}>
          <Text style={styles.montoLabelTotal}>Tu pago (88%):</Text>
          <Text style={styles.montoValueTotal}>{formatCurrency(item.pago_empresa)}</Text>
        </View>
      </View>

      {/* Indicador de pago si está pagada */}
      {item.pagado_empresa && (
        <View style={styles.fechaPagoContainer}>
          <Ionicons name="checkmark-circle" size={14} color="#28a745" />
          <Text style={styles.fechaPagoText}>Pago realizado</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header Premium */}
      <LinearGradient
        colors={['#FF6B35', '#FF8E53', '#FFB347']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerDecoration1} />
        <View style={styles.headerDecoration2} />
        
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <View style={styles.backButtonCircle}>
              <Ionicons name="arrow-back" size={20} color="#FF6B35" />
            </View>
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <View style={styles.headerIconBadge}>
              <Ionicons name="wallet" size={20} color="#fff" />
            </View>
            <View>
              <Text style={styles.headerSubtitle}>Gestión de</Text>
              <Text style={styles.headerTitle}>Mis Pagos</Text>
            </View>
          </View>
          
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      {/* Resumen de estadísticas */}
      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#FFF3CD' }]}>
              <Ionicons name="time-outline" size={20} color="#856404" />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>Pendientes de Pago</Text>
              <Text style={styles.statCount}>{stats.total_reservas_pendientes} reservas</Text>
              <Text style={[styles.statAmount, { color: '#856404' }]}>
                {formatCurrency(stats.valor_pendiente_empresa)}
              </Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#D4EDDA' }]}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#155724" />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>Ya Pagados</Text>
              <Text style={styles.statCount}>{stats.total_reservas_pagadas} reservas</Text>
              <Text style={[styles.statAmount, { color: '#155724' }]}>
                {formatCurrency(stats.valor_pagado_empresa)}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Info de comisión */}
      <View style={styles.comisionInfo}>
        <Ionicons name="information-circle-outline" size={16} color="#FF6B35" />
        <Text style={styles.comisionText}>
          Recibes el <Text style={styles.comisionBold}>88%</Text> de cada reserva completada. La comisión de la plataforma es del 12%.
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'pendientes' && styles.activeTabPendiente]}
          onPress={() => setActiveTab('pendientes')}
        >
          <Ionicons 
            name="time-outline" 
            size={18} 
            color={activeTab === 'pendientes' ? '#856404' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'pendientes' && styles.activeTabTextPendiente]}>
            Pendientes
          </Text>
          {stats && (
            <View style={[styles.tabBadge, activeTab === 'pendientes' && styles.tabBadgePendiente]}>
              <Text style={[styles.tabBadgeText, activeTab === 'pendientes' && styles.tabBadgeTextPendiente]}>
                {stats.total_reservas_pendientes}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'pagadas' && styles.activeTabPagado]}
          onPress={() => setActiveTab('pagadas')}
        >
          <Ionicons 
            name="checkmark-done-outline" 
            size={18} 
            color={activeTab === 'pagadas' ? '#155724' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'pagadas' && styles.activeTabTextPagado]}>
            Pagadas
          </Text>
          {stats && (
            <View style={[styles.tabBadge, activeTab === 'pagadas' && styles.tabBadgePagado]}>
              <Text style={[styles.tabBadgeText, activeTab === 'pagadas' && styles.tabBadgeTextPagado]}>
                {stats.total_reservas_pagadas}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Error */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={20} color="#856404" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchData()}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Lista de reservas */}
      <FlatList
        data={reservas}
        renderItem={renderReservaItem}
        keyExtractor={(item) => item.id_reserva.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF6B35']} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color="#FF6B35" />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons 
              name={activeTab === 'pendientes' ? 'time-outline' : 'checkmark-done-outline'} 
              size={64} 
              color="#ccc" 
            />
            <Text style={styles.emptyTitle}>
              {activeTab === 'pendientes' 
                ? 'No hay pagos pendientes' 
                : 'No hay pagos realizados'}
            </Text>
            <Text style={styles.emptyText}>
              {activeTab === 'pendientes' 
                ? 'Las reservas completadas aparecerán aquí hasta que recibas el pago'
                : 'Aquí verás el historial de pagos que ya recibiste'}
            </Text>
          </View>
        }
      />

      {/* Modal de detalle */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalle de Reserva</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {reservaDetalle && (
              <ScrollView style={styles.modalBody}>
                {/* Número de reserva */}
                <View style={styles.detalleSection}>
                  <View style={styles.detalleHeader}>
                    <Text style={styles.detalleNumero}>#{reservaDetalle.numero_reserva}</Text>
                    <View style={[
                      styles.detalleBadge,
                      { backgroundColor: reservaDetalle.pagado_empresa ? '#D4EDDA' : '#FFF3CD' }
                    ]}>
                      <Text style={[
                        styles.detalleBadgeText,
                        { color: reservaDetalle.pagado_empresa ? '#155724' : '#856404' }
                      ]}>
                        {reservaDetalle.pagado_empresa ? 'Pagado' : 'Pendiente'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Información del cliente */}
                <View style={styles.detalleSection}>
                  <Text style={styles.detalleSectionTitle}>Información del Cliente</Text>
                  <View style={styles.detalleRow}>
                    <Ionicons name="person-outline" size={16} color="#666" />
                    <Text style={styles.detalleText}>{reservaDetalle.cliente}</Text>
                  </View>
                  {reservaDetalle.telefono_cliente && (
                    <View style={styles.detalleRow}>
                      <Ionicons name="call-outline" size={16} color="#666" />
                      <Text style={styles.detalleText}>{reservaDetalle.telefono_cliente}</Text>
                    </View>
                  )}
                </View>

                {/* Fecha y hora */}
                <View style={styles.detalleSection}>
                  <Text style={styles.detalleSectionTitle}>Fecha y Hora</Text>
                  <View style={styles.detalleRow}>
                    <Ionicons name="calendar-outline" size={16} color="#666" />
                    <Text style={styles.detalleText}>{formatDate(reservaDetalle.fecha)}</Text>
                  </View>
                  <View style={styles.detalleRow}>
                    <Ionicons name="time-outline" size={16} color="#666" />
                    <Text style={styles.detalleText}>{formatTime(reservaDetalle.hora)}</Text>
                  </View>
                </View>

                {/* Servicios */}
                {reservaDetalle.servicios && reservaDetalle.servicios.length > 0 && (
                  <View style={styles.detalleSection}>
                    <Text style={styles.detalleSectionTitle}>Servicios Realizados</Text>
                    {reservaDetalle.servicios.filter(s => s.nombre).map((servicio, index) => (
                      <View key={index} style={styles.servicioRow}>
                        <Text style={styles.servicioNombre}>{servicio.nombre}</Text>
                        <Text style={styles.servicioPrecio}>{formatCurrency(servicio.precio)}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Desglose de pago */}
                <View style={[styles.detalleSection, styles.detalleSeccionPago]}>
                  <Text style={styles.detalleSectionTitle}>Desglose del Pago</Text>
                  
                  <View style={styles.pagoRow}>
                    <Text style={styles.pagoLabel}>Valor total del servicio</Text>
                    <Text style={styles.pagoValue}>{formatCurrency(reservaDetalle.total_original)}</Text>
                  </View>
                  
                  <View style={styles.pagoRow}>
                    <Text style={styles.pagoLabel}>Comisión plataforma (12%)</Text>
                    <Text style={[styles.pagoValue, styles.pagoComision]}>
                      -{formatCurrency(reservaDetalle.comision_plataforma)}
                    </Text>
                  </View>
                  
                  <View style={styles.pagoDivider} />
                  
                  <View style={styles.pagoRow}>
                    <Text style={styles.pagoLabelTotal}>Tu pago (88%)</Text>
                    <Text style={styles.pagoValueTotal}>{formatCurrency(reservaDetalle.pago_empresa)}</Text>
                  </View>
                </View>

                {/* Fecha de pago si aplica */}
                {reservaDetalle.pagado_empresa && (
                  <View style={styles.detallePagadoContainer}>
                    <Ionicons name="checkmark-circle" size={20} color="#28a745" />
                    <Text style={styles.detallePagadoText}>
                      Pago realizado a tu cuenta
                    </Text>
                  </View>
                )}

                {!reservaDetalle.pagado_empresa && (
                  <View style={styles.detallePendienteContainer}>
                    <Ionicons name="time" size={20} color="#856404" />
                    <Text style={styles.detallePendienteText}>
                      Pago pendiente - Recibirás este monto una vez procesemos la liquidación
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}

            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalCloseButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF8F5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  // Header
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
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  backButton: {},
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
    gap: 12,
  },
  headerIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  headerSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  // Stats
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statInfo: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  statCount: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  statAmount: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  // Comision info
  comisionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  comisionText: {
    flex: 1,
    fontSize: 12,
    color: '#FF6B35',
  },
  comisionBold: {
    fontWeight: 'bold',
  },
  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderRadius: 10,
  },
  activeTabPendiente: {
    backgroundColor: '#FFF3CD',
  },
  activeTabPagado: {
    backgroundColor: '#D4EDDA',
  },
  tabText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  activeTabTextPendiente: {
    color: '#856404',
    fontWeight: 'bold',
  },
  activeTabTextPagado: {
    color: '#155724',
    fontWeight: 'bold',
  },
  tabBadge: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tabBadgePendiente: {
    backgroundColor: '#856404',
  },
  tabBadgePagado: {
    backgroundColor: '#155724',
  },
  tabBadgeText: {
    fontSize: 11,
    color: '#666',
    fontWeight: 'bold',
  },
  tabBadgeTextPendiente: {
    color: '#fff',
  },
  tabBadgeTextPagado: {
    color: '#fff',
  },
  // Error
  errorContainer: {
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  errorText: {
    color: '#856404',
    flex: 1,
    fontSize: 13,
  },
  retryButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  // List
  listContainer: {
    padding: 16,
    paddingTop: 4,
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  // Reserva card
  reservaCard: {
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
  reservaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reservaNumeroContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reservaNumero: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  estadoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  estadoBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  reservaInfo: {
    marginBottom: 12,
    gap: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  reservaMontos: {
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  montoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  montoLabel: {
    fontSize: 13,
    color: '#666',
  },
  montoValue: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  montoComision: {
    color: '#DC3545',
  },
  montoRowTotal: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 8,
    marginTop: 4,
  },
  montoLabelTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  montoValueTotal: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  fechaPagoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    justifyContent: 'center',
  },
  fechaPagoText: {
    fontSize: 12,
    color: '#28a745',
    fontWeight: '500',
  },
  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    padding: 20,
  },
  detalleSection: {
    marginBottom: 20,
  },
  detalleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detalleNumero: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  detalleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  detalleBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  detalleSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  detalleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  detalleText: {
    fontSize: 14,
    color: '#666',
  },
  servicioRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  servicioNombre: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  servicioPrecio: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B35',
  },
  detalleSeccionPago: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  pagoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  pagoLabel: {
    fontSize: 14,
    color: '#666',
  },
  pagoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  pagoComision: {
    color: '#DC3545',
  },
  pagoDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 10,
  },
  pagoLabelTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  pagoValueTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  detallePagadoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#D4EDDA',
    padding: 14,
    borderRadius: 10,
    marginTop: 10,
  },
  detallePagadoText: {
    fontSize: 13,
    color: '#155724',
    fontWeight: '500',
    flex: 1,
  },
  detallePendienteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF3CD',
    padding: 14,
    borderRadius: 10,
    marginTop: 10,
  },
  detallePendienteText: {
    fontSize: 13,
    color: '#856404',
    fontWeight: '500',
    flex: 1,
  },
  modalCloseButton: {
    backgroundColor: '#FF6B35',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
