import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SectionList, ScrollView, Dimensions, ActivityIndicator, RefreshControl, Alert, Modal, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getReservasEmpresa, actualizarEstadoReserva, getReservaParaQR, ReservaEmpresa } from '@/services/api';

const { width } = Dimensions.get('window');

type Reservation = {
  id: string;
  service: string;
  client: string;
  date: string;
  time: string;
  status: 'pendiente' | 'completado' | 'cancelada';
  price: number;
  vehicle: string;
  telefono?: string;
  email?: string;
  servicios?: any[];
  numero_reserva?: string;
};

export default function CompanyReservations() {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'pending' | 'today' | 'week'>('all');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  
  // Estados para el modal QR
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [qrData, setQrData] = useState<string | null>(null);
  const [qrReserva, setQrReserva] = useState<Reservation | null>(null);
  const [loadingQR, setLoadingQR] = useState(false);

  const fetchReservations = async () => {
    try {
      setError(null);
      const response = await getReservasEmpresa();
      
      if (response.success && response.data) {
        // Transformar las reservas del backend al formato del componente
        const transformedReservations: Reservation[] = response.data.reservas.map((r: ReservaEmpresa) => {
          // Normalizar la fecha al formato YYYY-MM-DD
          let fechaNormalizada = '';
          if (r.fecha) {
            // Si viene como timestamp o ISO string
            if (r.fecha.includes('T')) {
              fechaNormalizada = r.fecha.split('T')[0];
            } else {
              fechaNormalizada = r.fecha;
            }
          }
          
          return {
            id: r.id_reserva.toString(),
            numero_reserva: r.numero_reserva,
            service: r.servicios?.map((s: any) => s.nombre_servicio).join(', ') || 'Sin servicios',
            client: r.nombre_cliente || 'Cliente',
            date: fechaNormalizada,
            time: r.hora?.substring(0, 5) || '00:00',
            status: r.estado as 'pendiente' | 'completado' | 'cancelada',
            price: parseFloat(r.total?.toString() || '0'),
            vehicle: r.placa_vehiculo || r.tipo_vehiculo || 'No especificado',
            telefono: r.telefono_cliente,
            email: r.email_cliente,
            servicios: r.servicios,
          };
        });
        setReservations(transformedReservations);
      } else {
        setError(response.message || 'Error al cargar reservas');
      }
    } catch (err) {
      console.error('Error fetching reservations:', err);
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchReservations();
  }, []);

  const handleUpdateStatus = async (reservaId: string, nuevoEstado: 'completado' | 'cancelada') => {
    try {
      setUpdatingId(reservaId);
      const response = await actualizarEstadoReserva(parseInt(reservaId), nuevoEstado);
      
      if (response.success) {
        // Actualizar el estado local
        setReservations(prev => prev.map(r => 
          r.id === reservaId ? { ...r, status: nuevoEstado } : r
        ));
        Alert.alert('Éxito', `Reserva ${nuevoEstado === 'completado' ? 'completada' : 'cancelada'} correctamente`);
      } else {
        Alert.alert('Error', response.message || 'No se pudo actualizar la reserva');
      }
    } catch (err) {
      console.error('Error updating reservation:', err);
      Alert.alert('Error', 'Error de conexión con el servidor');
    } finally {
      setUpdatingId(null);
    }
  };

  const confirmAction = (reservaId: string, action: 'completado' | 'cancelada') => {
    const actionText = action === 'completado' ? 'completar' : 'cancelar';
    Alert.alert(
      'Confirmar acción',
      `¿Estás seguro de que deseas ${actionText} esta reserva?`,
      [
        { text: 'No', style: 'cancel' },
        { text: 'Sí', onPress: () => handleUpdateStatus(reservaId, action) }
      ]
    );
  };

  // Función para mostrar el QR de una reserva
  const handleShowQR = async (reserva: Reservation) => {
    try {
      setLoadingQR(true);
      setQrReserva(reserva);
      
      const response = await getReservaParaQR(parseInt(reserva.id));
      
      if (response.success && response.data) {
        setQrData(response.data.qrData);
        setQrModalVisible(true);
      } else {
        Alert.alert('Error', response.message || 'No se pudo generar el código QR');
      }
    } catch (err) {
      console.error('Error generando QR:', err);
      Alert.alert('Error', 'Error al generar el código QR');
    } finally {
      setLoadingQR(false);
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

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Sin fecha';
    
    // Intentar parsear la fecha - manejar diferentes formatos
    let date: Date;
    
    // Si viene en formato ISO con tiempo (2025-12-02T00:00:00)
    if (dateString.includes('T')) {
      date = new Date(dateString);
    } 
    // Si viene solo la fecha (2025-12-02)
    else if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split('-').map(Number);
      date = new Date(year, month - 1, day);
    }
    // Otros formatos
    else {
      date = new Date(dateString);
    }
    
    // Verificar si la fecha es válida
    if (isNaN(date.getTime())) {
      console.log('Fecha inválida:', dateString);
      return 'Fecha inválida';
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    if (dateOnly.getTime() === today.getTime()) return 'Hoy';
    if (dateOnly.getTime() === tomorrow.getTime()) return 'Mañana';

    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'short'
    });
  };

  // Función para obtener la fecha local en formato YYYY-MM-DD
  const getLocalDateString = (date: Date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const stats = useMemo(() => {
    const today = getLocalDateString();
    const weekFromNow = getLocalDateString(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

    return {
      total: reservations.length,
      pending: reservations.filter((r: Reservation) => r.status === 'pendiente').length,
      today: reservations.filter((r: Reservation) => r.date === today).length,
      thisWeek: reservations.filter((r: Reservation) => r.date >= today && r.date <= weekFromNow).length,
      totalRevenue: reservations.filter((r: Reservation) => r.status === 'completado').reduce((sum: number, r: Reservation) => sum + r.price, 0),
    };
  }, [reservations]);

  const filteredReservations = useMemo(() => {
    const today = getLocalDateString();
    const weekFromNow = getLocalDateString(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

    let filtered = reservations;

    switch (filter) {
      case 'pending':
        filtered = reservations.filter((r: Reservation) => r.status === 'pendiente');
        break;
      case 'today':
        filtered = reservations.filter((r: Reservation) => r.date === today);
        break;
      case 'week':
        filtered = reservations.filter((r: Reservation) => r.date >= today && r.date <= weekFromNow);
        break;
    }

    // Group by date
    const grouped = filtered.reduce((acc: Record<string, Reservation[]>, reservation: Reservation) => {
      if (!acc[reservation.date]) {
        acc[reservation.date] = [];
      }
      acc[reservation.date].push(reservation);
      return acc;
    }, {} as Record<string, Reservation[]>);

    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, reservations]) => ({
        title: formatDate(date),
        date,
        data: reservations.sort((a, b) => a.time.localeCompare(b.time)),
      }));
  }, [filter, reservations]);

  const getServiceIcon = (service: string): keyof typeof Ionicons.glyphMap => {
    if (service.includes('Lavado')) return 'car-sport-outline';
    if (service.includes('Desinfección')) return 'sparkles-outline';
    if (service.includes('Encerado')) return 'diamond-outline';
    if (service.includes('Pulido')) return 'sunny-outline';
    return 'construct-outline';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendiente': return { bg: '#fff3cd', text: '#856404', border: '#ffeaa7' };
      case 'completado': return { bg: '#d4edda', text: '#155724', border: '#c3e6cb' };
      case 'cancelada': return { bg: '#f8d7da', text: '#721c24', border: '#f5c6cb' };
      default: return { bg: '#e2e3e5', text: '#383d41', border: '#d6d8db' };
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pendiente': return 'Pendiente';
      case 'completado': return 'Completado';
      case 'cancelada': return 'Cancelada';
      default: return status;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0C553C" />
        <Text style={styles.loadingText}>Cargando reservas...</Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: Reservation }) => {
    const statusColors = getStatusColor(item.status);
    const isUpdating = updatingId === item.id;

    return (
      <TouchableOpacity style={styles.reservationCard} activeOpacity={0.9}>
        <LinearGradient
          colors={['#ffffff', '#fafbfc']}
          style={styles.cardGradient}
        >
          <View style={styles.cardHeader}>
            <View style={styles.serviceIcon}>
              <Ionicons name={getServiceIcon(item.service)} size={24} color="#0C553C" />
            </View>
            <View style={styles.cardTitle}>
              <Text style={styles.serviceName} numberOfLines={2}>{item.service}</Text>
              <Text style={styles.vehicleInfo}>{item.vehicle}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusColors.bg, borderColor: statusColors.border }]}>
              <Text style={[styles.statusText, { color: statusColors.text }]}>
                {getStatusLabel(item.status)}
              </Text>
            </View>
          </View>

          <View style={styles.cardBody}>
            <View style={styles.clientInfo}>
              <Ionicons name="person-outline" size={18} color="#64748b" style={styles.infoIcon} />
              <View>
                <Text style={styles.clientName}>{item.client}</Text>
                {item.telefono && (
                  <View style={styles.phoneRow}>
                    <Ionicons name="call-outline" size={12} color="#94a3b8" />
                    <Text style={styles.clientPhone}>{item.telefono}</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.timeInfo}>
              <Ionicons name="time-outline" size={18} color="#64748b" style={styles.infoIcon} />
              <Text style={styles.timeText}>{item.time}</Text>
            </View>

            <View style={styles.priceInfo}>
              <Ionicons name="cash-outline" size={18} color="#0C553C" style={styles.infoIcon} />
              <Text style={styles.priceText}>{formatCurrency(item.price)}</Text>
            </View>
          </View>

          {item.status === 'pendiente' && (
            <View style={styles.cardActions}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.qrButton, (isUpdating || loadingQR) && styles.disabledButton]}
                onPress={() => handleShowQR(item)}
                disabled={isUpdating || loadingQR}
              >
                {loadingQR && qrReserva?.id === item.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <View style={styles.buttonContent}>
                    <Ionicons name="qr-code-outline" size={16} color="#fff" />
                    <Text style={styles.qrButtonText}>Mostrar QR</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, styles.cancelButton, isUpdating && styles.disabledButton]}
                onPress={() => confirmAction(item.id, 'cancelada')}
                disabled={isUpdating}
              >
                <View style={styles.buttonContent}>
                  <Ionicons name="close-outline" size={16} color="#dc2626" />
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }: any) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <Text style={styles.sectionCount}>{section.data.length} reserva{section.data.length !== 1 ? 's' : ''}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0C553C', '#0a4a32']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.replace('./company-dashboard')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <Text style={styles.title}>Reservas</Text>
            <Text style={styles.subtitle}>Gestiona tus citas</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pendientes</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.today}</Text>
            <Text style={styles.statLabel}>Hoy</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.thisWeek}</Text>
            <Text style={styles.statLabel}>Semana</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { fontSize: 14 }]}>{formatCurrency(stats.totalRevenue)}</Text>
            <Text style={styles.statLabel}>Ingresos</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.filtersContainer}>
        {[
          { key: 'all', label: 'Todas', count: stats.total },
          { key: 'pending', label: 'Pendientes', count: stats.pending },
          { key: 'today', label: 'Hoy', count: stats.today },
          { key: 'week', label: 'Esta Semana', count: stats.thisWeek },
        ].map(({ key, label, count }) => (
          <TouchableOpacity
            key={key}
            style={[styles.filterChip, filter === key && styles.filterChipActive]}
            onPress={() => setFilter(key as any)}
          >
            <Text style={[styles.filterChipText, filter === key && styles.filterChipTextActive]}>
              {label} ({count})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <SectionList
        style={{ flex: 1 }}
        sections={filteredReservations}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
        contentContainerStyle={[styles.listContainer, filteredReservations.length === 0 && { flexGrow: 1 }]}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0C553C']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyText}>No hay reservas</Text>
            <Text style={styles.emptySubtext}>
              {filter === 'all' ? 'Aún no tienes reservas registradas' : 
               filter === 'pending' ? 'No hay reservas pendientes' :
               filter === 'today' ? 'No hay reservas para hoy' : 
               'No hay reservas esta semana'}
            </Text>
          </View>
        }
      />

      {/* Modal para mostrar código QR */}
      <Modal
        visible={qrModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setQrModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Código QR de Reserva</Text>
              <TouchableOpacity onPress={() => setQrModalVisible(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            {qrReserva && (
              <View style={styles.qrInfo}>
                <View style={styles.qrInfoRow}>
                  <Ionicons name="document-text-outline" size={18} color="#0C553C" />
                  <Text style={styles.qrInfoText}>{qrReserva.numero_reserva || `Reserva #${qrReserva.id}`}</Text>
                </View>
                <View style={styles.qrInfoRow}>
                  <Ionicons name="person-outline" size={16} color="#666" />
                  <Text style={styles.qrInfoSubtext}>{qrReserva.client}</Text>
                </View>
                <View style={styles.qrInfoRow}>
                  <Ionicons name="calendar-outline" size={16} color="#666" />
                  <Text style={styles.qrInfoSubtext}>{formatDate(qrReserva.date)} - {qrReserva.time}</Text>
                </View>
              </View>
            )}

            <View style={styles.qrContainer}>
              {qrData ? (
                <View style={{ backgroundColor: 'white', padding: 10, borderRadius: 8 }}>
                  <Image
                    source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}` }}
                    style={{ width: 200, height: 200 }}
                    resizeMode="contain"
                  />
                </View>
              ) : (
                <ActivityIndicator size="large" color="#0C553C" />
              )}
            </View>

            <Text style={styles.qrInstruction}>
              El cliente debe escanear este código{'\n'}para completar la reserva
            </Text>

            <TouchableOpacity 
              style={styles.modalCloseMainButton}
              onPress={() => setQrModalVisible(false)}
            >
              <Text style={styles.modalCloseMainButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingTop: 50, paddingBottom: 24 },
  headerContent: { paddingHorizontal: 20 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginBottom: 12, alignSelf: 'flex-start' },
  backButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  headerTitle: { alignItems: 'center' },
  title: { color: '#fff', fontSize: 28, fontWeight: 'bold', textAlign: 'center' },
  subtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 16, textAlign: 'center', marginTop: 4 },
  statsScroll: { maxHeight: 100 },
  statsContainer: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16 },
  statCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginRight: 12, minWidth: 80, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  statNumber: { fontSize: 20, fontWeight: 'bold', color: '#0C553C' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 4, textAlign: 'center' },
  filtersContainer: { flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 16, flexWrap: 'wrap' },
  filterChip: { backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: '#e1e5e9' },
  filterChipActive: { backgroundColor: '#0C553C', borderColor: '#0C553C' },
  filterChipText: { fontSize: 14, color: '#666', fontWeight: '500' },
  filterChipTextActive: { color: '#fff' },
  listContainer: { paddingBottom: 40 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#f8fafc' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#0C553C' },
  sectionCount: { fontSize: 14, color: '#666', backgroundColor: '#e1e5e9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  itemSeparator: { height: 12 },
  reservationCard: { marginHorizontal: 20, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 },
  cardGradient: { padding: 20 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  serviceIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#f0f4f8', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  serviceEmoji: { fontSize: 24 },
  cardTitle: { flex: 1 },
  serviceName: { fontSize: 18, fontWeight: 'bold', color: '#0C553C', marginBottom: 2 },
  vehicleInfo: { fontSize: 14, color: '#666' },
  statusBadge: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },
  cardBody: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  clientInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  clientIcon: { fontSize: 16, marginRight: 6 },
  clientName: { fontSize: 14, color: '#333', fontWeight: '500' },
  timeInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'center' },
  timeIcon: { fontSize: 16, marginRight: 6 },
  timeText: { fontSize: 14, color: '#333', fontWeight: '500' },
  priceInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  priceIcon: { fontSize: 16, marginRight: 6 },
  priceText: { fontSize: 16, color: '#0C553C', fontWeight: 'bold' },
  cardActions: { flexDirection: 'row', justifyContent: 'space-between' },
  actionButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginHorizontal: 4 },
  confirmButton: { backgroundColor: '#0C553C' },
  confirmButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  cancelButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#dc3545' },
  cancelButtonText: { color: '#dc3545', fontWeight: '600', fontSize: 14 },
  disabledButton: { opacity: 0.5 },
  clientPhone: { fontSize: 12, color: '#888', marginTop: 2 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  loadingText: { marginTop: 12, fontSize: 16, color: '#666' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: '#666', textAlign: 'center', paddingHorizontal: 40 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  errorIcon: { fontSize: 48, marginBottom: 16 },
  errorText: { fontSize: 16, color: '#dc3545', textAlign: 'center', paddingHorizontal: 40, marginBottom: 16 },
  retryButton: { backgroundColor: '#0C553C', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryButtonText: { color: '#fff', fontWeight: '600' },
  // Estilos para el botón QR
  qrButton: { backgroundColor: '#2563eb' },
  qrButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  // Estilos para iconos y botones
  infoIcon: { marginRight: 8 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 4 },
  buttonContent: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qrInfoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 },
  // Estilos para el modal QR
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: width - 48, maxWidth: 380, alignItems: 'center' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#0C553C' },
  modalCloseButton: { padding: 8 },
  modalCloseText: { fontSize: 24, color: '#666' },
  qrInfo: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 12, width: '100%', marginBottom: 20 },
  qrInfoText: { fontSize: 16, fontWeight: '600', color: '#333', textAlign: 'center', marginBottom: 4 },
  qrInfoSubtext: { fontSize: 14, color: '#666', textAlign: 'center' },
  qrContainer: { padding: 20, backgroundColor: '#fff', borderRadius: 16, borderWidth: 2, borderColor: '#0C553C', marginBottom: 20 },
  qrInstruction: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  modalCloseMainButton: { backgroundColor: '#0C553C', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12, width: '100%' },
  modalCloseMainButtonText: { color: '#fff', fontWeight: '600', fontSize: 16, textAlign: 'center' },
});