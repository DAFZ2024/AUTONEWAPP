import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  getResumenPagos, 
  getPeriodosLiquidacion, 
  getDetallePeriodo,
  getReservasPendientesLiquidar,
  ResumenPagos,
  PeriodoLiquidacion,
  DetalleLiquidacion,
  ReservaPendienteLiquidar
} from '@/services/api';

type TabType = 'pendientes' | 'pagados';

export default function CompanyPayments() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('pendientes');
  const [error, setError] = useState<string | null>(null);
  
  // Datos
  const [resumen, setResumen] = useState<ResumenPagos | null>(null);
  const [periodosPendientes, setPeriodosPendientes] = useState<PeriodoLiquidacion[]>([]);
  const [periodosPagados, setPeriodosPagados] = useState<PeriodoLiquidacion[]>([]);
  const [reservasPendientes, setReservasPendientes] = useState<ReservaPendienteLiquidar[]>([]);
  
  // Modal de detalle
  const [modalVisible, setModalVisible] = useState(false);
  const [periodoDetalle, setPeriodoDetalle] = useState<PeriodoLiquidacion | null>(null);
  const [detallesLiquidacion, setDetallesLiquidacion] = useState<DetalleLiquidacion[]>([]);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  
  // Modal de reservas pendientes
  const [modalReservasVisible, setModalReservasVisible] = useState(false);

  const fetchData = async () => {
    try {
      setError(null);
      
      const [resumenRes, pendientesRes, pagadosRes, reservasRes] = await Promise.all([
        getResumenPagos(),
        getPeriodosLiquidacion('pendiente'),
        getPeriodosLiquidacion('pagado'),
        getReservasPendientesLiquidar()
      ]);

      if (resumenRes.success && resumenRes.data) {
        setResumen(resumenRes.data);
      }

      if (pendientesRes.success && pendientesRes.data) {
        setPeriodosPendientes(pendientesRes.data);
      }

      if (pagadosRes.success && pagadosRes.data) {
        setPeriodosPagados(pagadosRes.data);
      }

      if (reservasRes.success && reservasRes.data) {
        setReservasPendientes(reservasRes.data);
      }

    } catch (err) {
      console.error('Error fetching payments:', err);
      setError('Error al cargar la información de pagos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const handleVerDetalle = async (periodo: PeriodoLiquidacion) => {
    setModalVisible(true);
    setLoadingDetalle(true);
    setPeriodoDetalle(periodo);
    
    try {
      const response = await getDetallePeriodo(periodo.id_periodo.toString());
      if (response.success && response.data) {
        setDetallesLiquidacion(response.data.detalles);
      }
    } catch (err) {
      console.error('Error fetching period details:', err);
    } finally {
      setLoadingDetalle(false);
    }
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
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'activo': return '#17a2b8';
      case 'cerrado': return '#ffc107';
      case 'pagado': return '#28a745';
      case 'cancelado': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getEstadoLabel = (estado: string) => {
    switch (estado) {
      case 'activo': return 'Activo';
      case 'cerrado': return 'Cerrado';
      case 'pagado': return 'Pagado';
      case 'cancelado': return 'Cancelado';
      default: return estado;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0C553C" />
        <Text style={styles.loadingText}>Cargando pagos...</Text>
      </View>
    );
  }

  const periodos = activeTab === 'pendientes' ? periodosPendientes : periodosPagados;

  return (
    <View style={styles.container}>
      {/* Header Premium */}
      <LinearGradient
        colors={['#0C553C', '#0A4832', '#083D2A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerDecoration1} />
        <View style={styles.headerDecoration2} />
        
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <View style={styles.backButtonCircle}>
              <Ionicons name="arrow-back" size={20} color="#0C553C" />
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

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0C553C']} />
        }
      >
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={20} color="#856404" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
              <Text style={styles.retryText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Resumen de pagos - Rediseñado */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryHeader}>
            <View style={styles.summaryIconBadge}>
              <Ionicons name="stats-chart" size={16} color="#0C553C" />
            </View>
            <Text style={styles.sectionTitle}>Resumen de Pagos</Text>
          </View>
          
          {/* Cards principales - solo 2 */}
          <View style={styles.summaryGrid}>
            <View style={[styles.summaryCard, styles.summaryCardPrimary]}>
              <View style={[styles.summaryIconCircle, { backgroundColor: 'rgba(12, 85, 60, 0.15)' }]}>
                <Ionicons name="receipt" size={18} color="#0C553C" />
              </View>
              <Text style={styles.summaryAmount}>{resumen?.reservasSinLiquidar?.cantidad || 0}</Text>
              <Text style={styles.summaryLabel}>Sin Liquidar</Text>
              {resumen?.reservasSinLiquidar?.valor ? (
                <Text style={styles.summarySubLabel}>{formatCurrency(resumen.reservasSinLiquidar.valor)}</Text>
              ) : (
                <Text style={styles.summarySubLabel}>$0 pendiente</Text>
              )}
            </View>

            <View style={[styles.summaryCard, styles.summaryCardSuccess]}>
              <View style={[styles.summaryIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <Ionicons name="checkmark-circle" size={18} color="#10B981" />
              </View>
              <Text style={styles.summaryAmount}>{formatCurrency(resumen?.totalPagado || 0)}</Text>
              <Text style={styles.summaryLabel}>Total Recibido</Text>
              <Text style={styles.summarySubLabel}>{resumen?.periodosPagados || 0} pago(s) realizados</Text>
            </View>
          </View>

          {resumen?.ultimoPago && (
            <View style={styles.lastPaymentContainer}>
              <View style={styles.lastPaymentIcon}>
                <Ionicons name="checkmark-done" size={16} color="#10B981" />
              </View>
              <View style={styles.lastPaymentInfo}>
                <Text style={styles.lastPaymentTitle}>Último pago recibido</Text>
                <Text style={styles.lastPaymentText}>
                  {formatCurrency(resumen.ultimoPago.total_neto || 0)} • {formatDate(resumen.ultimoPago.fecha_pago)}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'pendientes' && styles.activeTab]}
            onPress={() => setActiveTab('pendientes')}
          >
            <Ionicons 
              name="time-outline" 
              size={18} 
              color={activeTab === 'pendientes' ? '#0C553C' : '#666'} 
            />
            <Text style={[styles.tabText, activeTab === 'pendientes' && styles.activeTabText]}>
              Pendientes ({periodosPendientes.length})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'pagados' && styles.activeTab]}
            onPress={() => setActiveTab('pagados')}
          >
            <Ionicons 
              name="checkmark-done-outline" 
              size={18} 
              color={activeTab === 'pagados' ? '#0C553C' : '#666'} 
            />
            <Text style={[styles.tabText, activeTab === 'pagados' && styles.activeTabText]}>
              Pagados ({periodosPagados.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Lista de períodos */}
        <View style={styles.listContainer}>
          {periodos.length > 0 && (
            periodos.map((periodo) => (
              <TouchableOpacity 
                key={periodo.id_periodo} 
                style={styles.periodoCard}
                onPress={() => handleVerDetalle(periodo)}
              >
                <View style={styles.periodoHeader}>
                  <View style={styles.periodoInfo}>
                    <Text style={styles.periodoId}>Período #{periodo.id_periodo}</Text>
                    <View style={[styles.estadoBadge, { backgroundColor: getEstadoColor(periodo.estado) }]}>
                      <Text style={styles.estadoText}>{getEstadoLabel(periodo.estado)}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#ccc" />
                </View>
                
                <View style={styles.periodoFechas}>
                  <View style={styles.fechaItem}>
                    <Ionicons name="calendar-outline" size={14} color="#666" />
                    <Text style={styles.fechaLabel}>Desde:</Text>
                    <Text style={styles.fechaValue}>{formatDate(periodo.fecha_inicio)}</Text>
                  </View>
                  <View style={styles.fechaItem}>
                    <Ionicons name="calendar" size={14} color="#666" />
                    <Text style={styles.fechaLabel}>Hasta:</Text>
                    <Text style={styles.fechaValue}>{formatDate(periodo.fecha_fin)}</Text>
                  </View>
                </View>

                <View style={styles.periodoMontos}>
                  <View style={styles.montoItem}>
                    <Text style={styles.montoLabel}>Total Reservas</Text>
                    <Text style={styles.montoValue}>{formatCurrency(periodo.total_bruto)}</Text>
                  </View>
                  <View style={styles.montoItem}>
                    <Text style={styles.montoLabel}>Comisión</Text>
                    <Text style={[styles.montoValue, { color: '#dc3545' }]}>
                      -{formatCurrency(periodo.total_comision)}
                    </Text>
                  </View>
                  <View style={styles.montoItem}>
                    <Text style={styles.montoLabel}>A Recibir</Text>
                    <Text style={[styles.montoValue, styles.montoNeto]}>
                      {formatCurrency(periodo.total_neto)}
                    </Text>
                  </View>
                </View>

                {periodo.fecha_pago && (
                  <View style={styles.fechaPago}>
                    <Ionicons name="checkmark-circle" size={16} color="#28a745" />
                    <Text style={styles.fechaPagoText}>
                      Pagado el {formatDate(periodo.fecha_pago)}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Reservas pendientes de liquidar */}
        {activeTab === 'pendientes' && reservasPendientes.length > 0 && (
          <View style={styles.reservasPendientesContainer}>
            <View style={styles.reservasTitleRow}>
              <Ionicons name="list-outline" size={20} color="#0C553C" />
              <Text style={styles.reservasTitle}>Reservas sin Liquidar</Text>
              <View style={styles.reservasBadge}>
                <Text style={styles.reservasBadgeText}>{reservasPendientes.length}</Text>
              </View>
            </View>
            
            <Text style={styles.reservasSubtitle}>
              Estas reservas completadas aún no han sido incluidas en un período de liquidación
            </Text>

            {reservasPendientes.slice(0, 5).map((reserva) => (
              <View key={reserva.id_reserva} style={styles.reservaItem}>
                <View style={styles.reservaInfo}>
                  <Text style={styles.reservaNumero}>#{reserva.numero_reserva}</Text>
                  <Text style={styles.reservaFecha}>{formatDate(reserva.fecha)}</Text>
                </View>
                <Text style={styles.reservaMonto}>{formatCurrency(Number(reserva.total_servicio) || 0)}</Text>
              </View>
            ))}

            {reservasPendientes.length > 5 && (
              <TouchableOpacity 
                style={styles.verTodasButton}
                onPress={() => setModalReservasVisible(true)}
              >
                <Ionicons name="eye-outline" size={18} color="#0C553C" />
                <Text style={styles.verTodasText}>
                  Ver todas ({reservasPendientes.length} reservas)
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Modal de detalle del período */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Detalle del Período #{periodoDetalle?.id_periodo}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {loadingDetalle ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color="#0C553C" />
                <Text>Cargando detalles...</Text>
              </View>
            ) : (
              <ScrollView style={styles.modalBody}>
                {periodoDetalle && (
                  <>
                    <View style={styles.detalleResumen}>
                      <View style={styles.detalleRow}>
                        <Text style={styles.detalleLabel}>Estado:</Text>
                        <View style={[styles.estadoBadge, { backgroundColor: getEstadoColor(periodoDetalle.estado) }]}>
                          <Text style={styles.estadoText}>{getEstadoLabel(periodoDetalle.estado)}</Text>
                        </View>
                      </View>
                      <View style={styles.detalleRow}>
                        <Text style={styles.detalleLabel}>Período:</Text>
                        <Text style={styles.detalleValue}>
                          {formatDate(periodoDetalle.fecha_inicio)} - {formatDate(periodoDetalle.fecha_fin)}
                        </Text>
                      </View>
                      <View style={styles.detalleRow}>
                        <Text style={styles.detalleLabel}>Total Reservas:</Text>
                        <Text style={styles.detalleValue}>{formatCurrency(periodoDetalle.total_bruto)}</Text>
                      </View>
                      <View style={styles.detalleRow}>
                        <Text style={styles.detalleLabel}>Comisión:</Text>
                        <Text style={[styles.detalleValue, { color: '#dc3545' }]}>
                          -{formatCurrency(periodoDetalle.total_comision)}
                        </Text>
                      </View>
                      <View style={[styles.detalleRow, styles.detalleRowNeto]}>
                        <Text style={styles.detalleLabelNeto}>Monto Neto:</Text>
                        <Text style={styles.detalleValueNeto}>{formatCurrency(periodoDetalle.total_neto)}</Text>
                      </View>
                    </View>

                    <Text style={styles.detallesTitle}>
                      Reservas Incluidas ({detallesLiquidacion.length})
                    </Text>

                    {detallesLiquidacion.length === 0 ? (
                      <Text style={styles.noDetalles}>No hay detalles disponibles</Text>
                    ) : (
                      detallesLiquidacion.map((detalle) => (
                        <View key={detalle.id_detalle} style={styles.detalleItem}>
                          <View style={styles.detalleItemHeader}>
                            <Text style={styles.detalleNumero}>#{detalle.numero_reserva}</Text>
                            <Text style={styles.detalleFecha}>{formatDate(detalle.fecha_servicio || detalle.fecha)}</Text>
                          </View>
                          <View style={styles.detalleItemBody}>
                            <View style={styles.detalleItemRow}>
                              <Text style={styles.detalleItemLabel}>Monto:</Text>
                              <Text style={styles.detalleItemValue}>{formatCurrency(detalle.valor_bruto)}</Text>
                            </View>
                            <View style={styles.detalleItemRow}>
                              <Text style={styles.detalleItemLabel}>Comisión:</Text>
                              <Text style={[styles.detalleItemValue, { color: '#dc3545' }]}>
                                -{formatCurrency(detalle.valor_comision)}
                              </Text>
                            </View>
                            <View style={styles.detalleItemRow}>
                              <Text style={[styles.detalleItemLabel, { fontWeight: 'bold' }]}>Neto:</Text>
                              <Text style={[styles.detalleItemValue, { fontWeight: 'bold', color: '#0C553C' }]}>
                                {formatCurrency(detalle.valor_final_empresa)}
                              </Text>
                            </View>
                          </View>
                        </View>
                      ))
                    )}
                  </>
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

      {/* Modal de todas las reservas pendientes */}
      <Modal
        visible={modalReservasVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalReservasVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Reservas Sin Liquidar ({reservasPendientes.length})
              </Text>
              <TouchableOpacity onPress={() => setModalReservasVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.reservasModalInfo}>
                <Ionicons name="information-circle-outline" size={20} color="#0C553C" />
                <Text style={styles.reservasModalInfoText}>
                  Estas reservas completadas aún no han sido incluidas en un período de liquidación
                </Text>
              </View>

              <View style={styles.reservasModalTotal}>
                <Text style={styles.reservasModalTotalLabel}>Total pendiente:</Text>
                <Text style={styles.reservasModalTotalValue}>
                  {formatCurrency(reservasPendientes.reduce((sum, r) => sum + (Number(r.total_servicio) || 0), 0))}
                </Text>
              </View>

              {reservasPendientes.map((reserva) => (
                <View key={reserva.id_reserva} style={styles.reservaModalItem}>
                  <View style={styles.reservaModalHeader}>
                    <Text style={styles.reservaModalNumero}>#{reserva.numero_reserva}</Text>
                    <Text style={styles.reservaModalMonto}>{formatCurrency(Number(reserva.total_servicio) || 0)}</Text>
                  </View>
                  <View style={styles.reservaModalDetails}>
                    <View style={styles.reservaModalDetailRow}>
                      <Ionicons name="calendar-outline" size={14} color="#666" />
                      <Text style={styles.reservaModalDetailText}>{formatDate(reserva.fecha)}</Text>
                    </View>
                    {reserva.cliente && (
                      <View style={styles.reservaModalDetailRow}>
                        <Ionicons name="person-outline" size={14} color="#666" />
                        <Text style={styles.reservaModalDetailText}>{reserva.cliente}</Text>
                      </View>
                    )}
                    {reserva.servicios && reserva.servicios.length > 0 && (
                      <View style={styles.reservaModalDetailRow}>
                        <Ionicons name="car-outline" size={14} color="#666" />
                        <Text style={styles.reservaModalDetailText} numberOfLines={1}>
                          {reserva.servicios.map(s => s.nombre).join(', ')}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setModalReservasVisible(false)}
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
    backgroundColor: '#F0F4F3',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F4F3',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
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
  content: {
    flex: 1,
    padding: 16,
  },
  errorContainer: {
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  errorText: {
    color: '#856404',
    flex: 1,
  },
  retryButton: {
    backgroundColor: '#0C553C',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  // Resumen de Pagos
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  summaryContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  summaryIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#E8F5F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryCard: {
    width: '48%',
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  summaryCardWarning: {
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  summaryCardDanger: {
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  summaryCardSuccess: {
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  summaryCardPrimary: {
    borderLeftWidth: 3,
    borderLeftColor: '#0C553C',
  },
  summaryIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
    textAlign: 'center',
    fontWeight: '500',
  },
  summarySubLabel: {
    fontSize: 9,
    color: '#888',
    marginTop: 2,
    textAlign: 'center',
  },
  summarySubAmount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0C553C',
    marginTop: 2,
  },
  // Total Bar
  totalBar: {
    flexDirection: 'row',
    backgroundColor: '#0C553C',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    alignItems: 'center',
  },
  totalBarItem: {
    flex: 1,
    alignItems: 'center',
  },
  totalBarLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  totalBarValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  totalBarDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  // Último pago
  lastPaymentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  lastPaymentIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lastPaymentInfo: {
    flex: 1,
  },
  lastPaymentTitle: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2,
  },
  lastPaymentText: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 20,
    padding: 5,
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
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: 'rgba(12, 85, 60, 0.1)',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#0C553C',
    fontWeight: 'bold',
  },
  listContainer: {
    marginBottom: 20,
  },
  emptyContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 15,
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  periodoCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  periodoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  periodoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  periodoId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  estadoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  estadoText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  periodoFechas: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  fechaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fechaLabel: {
    fontSize: 12,
    color: '#666',
  },
  fechaValue: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  periodoMontos: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  montoItem: {
    alignItems: 'center',
    flex: 1,
  },
  montoLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 3,
  },
  montoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  montoNeto: {
    color: '#0C553C',
    fontWeight: 'bold',
  },
  fechaPago: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    justifyContent: 'center',
  },
  fechaPagoText: {
    fontSize: 13,
    color: '#28a745',
    fontWeight: '500',
  },
  reservasPendientesContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  reservasTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  reservasTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0C553C',
    flex: 1,
  },
  reservasBadge: {
    backgroundColor: '#0C553C',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  reservasBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  reservasSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 15,
  },
  reservaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  reservaInfo: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  reservaNumero: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  reservaFecha: {
    fontSize: 12,
    color: '#666',
  },
  reservaMonto: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0C553C',
  },
  verMasText: {
    fontSize: 13,
    color: '#0C553C',
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '500',
  },
  verTodasButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  verTodasText: {
    fontSize: 14,
    color: '#0C553C',
    fontWeight: '600',
  },
  reservasModalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    gap: 10,
  },
  reservasModalInfoText: {
    flex: 1,
    fontSize: 13,
    color: '#0C553C',
  },
  reservasModalTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0C553C',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  reservasModalTotalLabel: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  reservasModalTotalValue: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  reservaModalItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#0C553C',
  },
  reservaModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  reservaModalNumero: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  reservaModalMonto: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0C553C',
  },
  reservaModalDetails: {
    gap: 6,
  },
  reservaModalDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reservaModalDetailText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
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
  modalLoading: {
    padding: 40,
    alignItems: 'center',
    gap: 10,
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  detalleResumen: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  detalleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  detalleLabel: {
    fontSize: 14,
    color: '#666',
  },
  detalleValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  detalleRowNeto: {
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    paddingTop: 10,
    marginTop: 5,
    marginBottom: 0,
  },
  detalleLabelNeto: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0C553C',
  },
  detalleValueNeto: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0C553C',
  },
  detallesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  noDetalles: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    padding: 20,
  },
  detalleItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#0C553C',
  },
  detalleItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detalleNumero: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  detalleFecha: {
    fontSize: 12,
    color: '#666',
  },
  detalleItemBody: {},
  detalleItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detalleItemLabel: {
    fontSize: 13,
    color: '#666',
  },
  detalleItemValue: {
    fontSize: 13,
    color: '#333',
  },
  modalCloseButton: {
    backgroundColor: '#0C553C',
    margin: 20,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
