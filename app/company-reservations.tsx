import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SectionList, ScrollView, Dimensions, ActivityIndicator, RefreshControl, Alert, Modal, Image, AppState, Vibration } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getReservasEmpresa, actualizarEstadoReserva, getReservaParaQR, ReservaEmpresa } from '@/services/api';

// Intervalo de actualización mientras se muestra el QR (4 segundos)
const QR_POLLING_INTERVAL = 4000;

const { width } = Dimensions.get('window');

type Reservation = {
  id: string;
  service: string;
  client: string;
  date: string;
  time: string;
  status: 'pendiente' | 'completado' | 'completada' | 'cancelada' | 'vencida';
  price: number;
  vehicle: string;
  telefono?: string;
  email?: string;
  servicios?: any[];
  numero_reserva?: string;
  puntuacion?: number;
  comentario?: string;
};

export default function CompanyReservations() {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'expired' | 'today' | 'week'>('all');
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
  
  // Estado para modal de confirmación exitosa
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [confirmedReserva, setConfirmedReserva] = useState<Reservation | null>(null);
  
  // Ref para el intervalo de polling del QR
  const qrPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Función para verificar si la reserva fue confirmada (usada en polling del QR)
  const checkReservaStatus = useCallback(async () => {
    if (!qrReserva) return;
    
    try {
      const response = await getReservasEmpresa();
      
      if (response.success && response.data) {
        const reservaActualizada = response.data.reservas.find(
          (r: ReservaEmpresa) => r.id_reserva.toString() === qrReserva.id
        );
        
        if (reservaActualizada && reservaActualizada.estado === 'completado') {
          // ¡La reserva fue confirmada!
          // Vibrar el dispositivo para notificar
          Vibration.vibrate([0, 300, 100, 300]);
          
          // Detener el polling
          if (qrPollingRef.current) {
            clearInterval(qrPollingRef.current);
            qrPollingRef.current = null;
          }
          
          // Cerrar modal QR y mostrar modal de éxito
          setQrModalVisible(false);
          setConfirmedReserva({
            ...qrReserva,
            status: 'completado'
          });
          setShowSuccessModal(true);
          
          // Actualizar la lista de reservas
          const transformedReservations: Reservation[] = response.data.reservas.map((r: ReservaEmpresa) => {
            let fechaNormalizada = '';
            if (r.fecha) {
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
              status: r.estado as 'pendiente' | 'completado' | 'cancelada' | 'vencida',
              price: parseFloat(r.total?.toString() || '0'),
              vehicle: r.placa_vehiculo || r.tipo_vehiculo || 'No especificado',
              telefono: r.telefono_cliente,
              email: r.email_cliente,
              servicios: r.servicios,
            };
          });
          setReservations(transformedReservations);
          
          // Cerrar modal de éxito después de 3 segundos
          setTimeout(() => {
            setShowSuccessModal(false);
            setConfirmedReserva(null);
            setQrReserva(null);
          }, 3000);
        }
      }
    } catch (err) {
      console.error('Error checking reservation status:', err);
    }
  }, [qrReserva]);
  
  // Efecto para iniciar/detener el polling cuando el modal QR está visible
  useEffect(() => {
    if (qrModalVisible && qrReserva) {
      // Iniciar polling cada 4 segundos
      qrPollingRef.current = setInterval(checkReservaStatus, QR_POLLING_INTERVAL);
      console.log('[QR Polling] Iniciado para reserva:', qrReserva.id);
    } else {
      // Detener polling cuando se cierra el modal
      if (qrPollingRef.current) {
        clearInterval(qrPollingRef.current);
        qrPollingRef.current = null;
        console.log('[QR Polling] Detenido');
      }
    }
    
    // Cleanup al desmontar
    return () => {
      if (qrPollingRef.current) {
        clearInterval(qrPollingRef.current);
        qrPollingRef.current = null;
      }
    };
  }, [qrModalVisible, qrReserva, checkReservaStatus]);

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
          
          // Log para depurar qué está llegando
          if (r.puntuacion) {
            console.log(`[Reserva ${r.id_reserva}] Rating:`, r.puntuacion, 'Comentario:', r.comentario_calificacion, 'Status:', r.estado);
          }

          return {
            id: r.id_reserva.toString(),
            numero_reserva: r.numero_reserva,
            service: r.servicios?.map((s: any) => s.nombre_servicio).join(', ') || 'Sin servicios',
            client: r.nombre_cliente || 'Cliente',
            date: fechaNormalizada,
            time: r.hora?.substring(0, 5) || '00:00',
            status: r.estado.toLowerCase() as 'pendiente' | 'completado' | 'completada' | 'cancelada' | 'vencida',
            price: parseFloat(r.total?.toString() || '0'),
            vehicle: r.placa_vehiculo || r.tipo_vehiculo || 'No especificado',
            telefono: r.telefono_cliente,
            email: r.email_cliente,
            servicios: r.servicios,
            puntuacion: r.puntuacion ? Number(r.puntuacion) : undefined,
            comentario: r.comentario_calificacion, // Usar el alias correcto del backend
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

  // Constante para la comisión de la plataforma (12%)
  const COMISION_PLATAFORMA = 0.12;

  // Función para calcular el ingreso neto después de la comisión
  const calcularIngresoNeto = (amount: number) => {
    return amount * (1 - COMISION_PLATAFORMA);
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
      completed: reservations.filter((r: Reservation) => r.status === 'completado' || r.status === 'completada').length,
      expired: reservations.filter((r: Reservation) => r.status === 'vencida').length,
      today: reservations.filter((r: Reservation) => r.date === today).length,
      thisWeek: reservations.filter((r: Reservation) => r.date >= today && r.date <= weekFromNow).length,
      totalRevenue: reservations.filter((r: Reservation) => r.status === 'completado' || r.status === 'completada').reduce((sum: number, r: Reservation) => sum + r.price, 0),
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
      case 'completed':
        filtered = reservations.filter((r: Reservation) => r.status === 'completado' || r.status === 'completada');
        break;
      case 'expired':
        filtered = reservations.filter((r: Reservation) => r.status === 'vencida');
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
      case 'vencida': return { bg: '#FFE8D6', text: '#E67E22', border: '#F5B041' };
      default: return { bg: '#e2e3e5', text: '#383d41', border: '#d6d8db' };
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pendiente': return 'Pendiente';
      case 'completado': return 'Completado';
      case 'cancelada': return 'Cancelada';
      case 'vencida': return 'Vencida';
      default: return status;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#CC5F2A" />
        <Text style={styles.loadingText}>Cargando reservas...</Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: Reservation }) => {
    const statusColors = getStatusColor(item.status);
    const isUpdating = updatingId === item.id;

    return (
      <TouchableOpacity style={styles.reservationCard} activeOpacity={0.95}>
        <LinearGradient
          colors={['#ffffff', '#f8faf9']}
          style={styles.cardGradient}
        >
          {/* Barra de estado superior */}
          <View style={[styles.cardStatusBar, { backgroundColor: statusColors.bg }]}>
            <View style={[styles.cardStatusIndicator, { backgroundColor: statusColors.text }]} />
            <Text style={[styles.cardStatusText, { color: statusColors.text }]}>
              {getStatusLabel(item.status)}
            </Text>
            {item.numero_reserva && (
              <Text style={styles.cardReservaNum}>#{item.numero_reserva}</Text>
            )}
          </View>

          {/* Header con servicio */}
          <View style={styles.cardHeader}>
            <View style={styles.serviceIconContainer}>
              <LinearGradient
                colors={['rgba(204, 95, 42, 0.1)', 'rgba(204, 95, 42, 0.05)']}
                style={styles.serviceIcon}
              >
                <Ionicons name={getServiceIcon(item.service)} size={26} color="#CC5F2A" />
              </LinearGradient>
            </View>
            <View style={styles.cardTitle}>
              <Text style={styles.serviceName} numberOfLines={2}>{item.service}</Text>
              {item.vehicle && item.vehicle !== 'No especificado' && (
                <View style={styles.vehicleRow}>
                  <Ionicons name="car-sport-outline" size={14} color="#64748b" />
                  <Text style={styles.vehicleInfo}>{item.vehicle}</Text>
                </View>
              )}
            </View>
            <View style={styles.priceContainer}>
              <Text style={styles.priceCurrency}>$</Text>
              <Text style={styles.priceAmount}>{formatCurrency(calcularIngresoNeto(item.price)).replace('$', '')}</Text>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.cardDivider} />

          {/* Info del cliente y hora */}
          <View style={styles.cardInfoSection}>
            <View style={styles.infoCard}>
              <View style={styles.infoCardIcon}>
                <Ionicons name="person" size={16} color="#CC5F2A" />
              </View>
              <View style={styles.infoCardContent}>
                <Text style={styles.infoCardLabel}>Cliente</Text>
                <Text style={styles.infoCardValue}>{item.client}</Text>
                {item.telefono && (
                  <View style={styles.phoneRow}>
                    <Ionicons name="call" size={10} color="#94a3b8" />
                    <Text style={styles.clientPhone}>{item.telefono}</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoCardIcon}>
                <Ionicons name="time" size={16} color="#CC5F2A" />
              </View>
              <View style={styles.infoCardContent}>
                <Text style={styles.infoCardLabel}>Hora</Text>
                <Text style={styles.infoCardValue}>{item.time}</Text>
              </View>
            </View>
          </View>

          {/* Calificación del Usuario - Solo si está completada y tiene calificación */}
          {(item.status === 'completado' || item.status === 'completada') && (item.puntuacion || 0) > 0 && (
            <View style={styles.ratingContainer}>
              <View style={styles.ratingHeader}>
                <Text style={styles.ratingLabel}>Calificación del usuario:</Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Ionicons
                      key={star}
                      name={star <= (item.puntuacion || 0) ? "star" : "star-outline"}
                      size={16}
                      color="#FFB300"
                    />
                  ))}
                </View>
              </View>
              {item.comentario && (
                <Text style={styles.ratingComment}>"{item.comentario}"</Text>
              )}
            </View>
          )}

          {/* Botón QR para pendientes */}
          {item.status === 'pendiente' && (
            <TouchableOpacity 
              style={[styles.qrButton, (isUpdating || loadingQR) && styles.disabledButton]}
              onPress={() => handleShowQR(item)}
              disabled={isUpdating || loadingQR}
            >
              <LinearGradient
                colors={['#9E3A10', '#CC5F2A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.qrButtonGradient}
              >
                {loadingQR && qrReserva?.id === item.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="qr-code" size={18} color="#fff" />
                    <Text style={styles.qrButtonText}>Mostrar Código QR</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Mensaje para reservas vencidas */}
          {item.status === 'vencida' && (
            <View style={styles.expiredMessageContainer}>
              <View style={styles.expiredMessageIcon}>
                <Ionicons name="hourglass-outline" size={20} color="#E67E22" />
              </View>
              <View style={styles.expiredMessageContent}>
                <Text style={styles.expiredMessageTitle}>Esperando Reagendamiento</Text>
                <Text style={styles.expiredMessageText}>
                  El cliente debe reagendar esta cita y pagar el recargo del 25%
                </Text>
              </View>
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
        colors={['#9E3A10', '#B54A1C', '#CC5F2A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        {/* Decoraciones de fondo */}
        <View style={styles.headerDecoration1} />
        <View style={styles.headerDecoration2} />
        <View style={styles.headerDecoration3} />
        
        <View style={styles.headerContent}>
          {/* Fila superior: Volver + Icono */}
          <View style={styles.headerTopRow}>
            <TouchableOpacity onPress={() => router.replace('./company-dashboard')} style={styles.backButton}>
              <View style={styles.backButtonInner}>
                <Ionicons name="arrow-back" size={18} color="#CC5F2A" />
              </View>
              <Text style={styles.backButtonText}>Volver</Text>
            </TouchableOpacity>
            
            <View style={styles.headerIconContainer}>
              <LinearGradient
                colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.1)']}
                style={styles.headerIconBg}
              >
                <Ionicons name="calendar" size={24} color="#fff" />
              </LinearGradient>
            </View>
          </View>
          
          {/* Título principal */}
          <View style={styles.headerTitleSection}>
            <Text style={styles.title}>Gestión de Reservas</Text>
            <Text style={styles.subtitle}>Administra todas las citas de tu empresa</Text>
          </View>
          
          {/* Mini stats en header */}
          <View style={styles.headerMiniStats}>
            <View style={styles.miniStatItem}>
              <View style={styles.miniStatIcon}>
                <Ionicons name="time-outline" size={16} color="#CC5F2A" />
              </View>
              <View>
                <Text style={styles.miniStatValue}>{stats.pending}</Text>
                <Text style={styles.miniStatLabel}>Pendientes</Text>
              </View>
            </View>
            <View style={styles.miniStatDivider} />
            <View style={styles.miniStatItem}>
              <View style={styles.miniStatIcon}>
                <Ionicons name="today-outline" size={16} color="#CC5F2A" />
              </View>
              <View>
                <Text style={styles.miniStatValue}>{stats.today}</Text>
                <Text style={styles.miniStatLabel}>Hoy</Text>
              </View>
            </View>
            <View style={styles.miniStatDivider} />
            <View style={styles.miniStatItem}>
              <View style={styles.miniStatIcon}>
                <Ionicons name="cash-outline" size={16} color="#CC5F2A" />
              </View>
              <View>
                <Text style={styles.miniStatValue}>{formatCurrency(calcularIngresoNeto(stats.totalRevenue))}</Text>
                <Text style={styles.miniStatLabel}>Ingresos Netos</Text>
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.filtersSection}>
        <View style={styles.filtersTitleRow}>
          <Ionicons name="filter-outline" size={18} color="#CC5F2A" />
          <Text style={styles.filtersTitle}>Filtrar por</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
          <View style={styles.filtersContainer}>
            {[
              { key: 'all', label: 'Todas', count: stats.total, icon: 'list-outline', isExpired: false },
              { key: 'pending', label: 'Pendientes', count: stats.pending, icon: 'time-outline', isExpired: false },
              { key: 'completed', label: 'Completadas', count: stats.completed, icon: 'checkmark-circle-outline', isExpired: false },
              { key: 'expired', label: 'Vencidas', count: stats.expired, icon: 'alert-circle-outline', isExpired: true },
              { key: 'today', label: 'Hoy', count: stats.today, icon: 'today-outline', isExpired: false },
              { key: 'week', label: 'Esta Semana', count: stats.thisWeek, icon: 'calendar-outline', isExpired: false },
            ].map(({ key, label, count, icon, isExpired }) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.filterChip, 
                  filter === key && styles.filterChipActive,
                  isExpired && filter !== key && styles.filterChipExpired,
                  isExpired && filter === key && styles.filterChipExpiredActive
                ]}
                onPress={() => setFilter(key as any)}
              >
                <View style={styles.filterChipContent}>
                  <Ionicons 
                    name={icon as any} 
                    size={16} 
                    color={filter === key ? '#fff' : (isExpired ? '#E67E22' : '#CC5F2A')} 
                  />
                  <Text style={[
                    styles.filterChipText, 
                    filter === key && styles.filterChipTextActive,
                    isExpired && filter !== key && styles.filterChipTextExpired
                  ]}>
                    {label}
                  </Text>
                  <View style={[
                    styles.filterChipBadge, 
                    filter === key && styles.filterChipBadgeActive,
                    isExpired && filter !== key && styles.filterChipBadgeExpired,
                    isExpired && filter === key && styles.filterChipBadgeExpiredActive
                  ]}>
                    <Text style={[
                      styles.filterChipBadgeText, 
                      filter === key && styles.filterChipBadgeTextActive,
                      isExpired && filter !== key && styles.filterChipBadgeTextExpired
                    ]}>
                      {count}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#CC5F2A']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyText}>No hay reservas</Text>
            <Text style={styles.emptySubtext}>
              {filter === 'all' ? 'Aún no tienes reservas registradas' : 
               filter === 'pending' ? 'No hay reservas pendientes' :
               filter === 'expired' ? 'No hay reservas vencidas' :
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
                  <Ionicons name="document-text-outline" size={18} color="#CC5F2A" />
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
                <ActivityIndicator size="large" color="#CC5F2A" />
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

      {/* Modal de Reserva Confirmada */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContainer}>
            <LinearGradient
              colors={['#10B981', '#059669', '#047857']}
              style={styles.successModalGradient}
            >
              {/* Círculos decorativos */}
              <View style={styles.successCircle1} />
              <View style={styles.successCircle2} />
              
              {/* Ícono de éxito */}
              <View style={styles.successIconContainer}>
                <View style={styles.successIconOuter}>
                  <View style={styles.successIconInner}>
                    <Ionicons name="checkmark" size={50} color="#10B981" />
                  </View>
                </View>
              </View>

              <Text style={styles.successTitle}>¡Reserva Confirmada!</Text>
              <Text style={styles.successSubtitle}>
                El cliente ha escaneado el código QR
              </Text>

              {confirmedReserva && (
                <View style={styles.successDetails}>
                  <View style={styles.successDetailRow}>
                    <Ionicons name="person" size={16} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.successDetailText}>{confirmedReserva.client}</Text>
                  </View>
                  <View style={styles.successDetailRow}>
                    <Ionicons name="car" size={16} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.successDetailText}>{confirmedReserva.vehicle}</Text>
                  </View>
                  <View style={styles.successDetailRow}>
                    <Ionicons name="pricetag" size={16} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.successDetailText}>{confirmedReserva.service}</Text>
                  </View>
                </View>
              )}

              <View style={styles.successPriceContainer}>
                <Text style={styles.successPriceLabel}>Total cobrado</Text>
                <Text style={styles.successPriceValue}>
                  {confirmedReserva ? formatCurrency(confirmedReserva.price) : '$0'}
                </Text>
              </View>
            </LinearGradient>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingTop: 50, paddingBottom: 20, position: 'relative', overflow: 'hidden' },
  headerDecoration1: { position: 'absolute', top: -50, right: -50, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.08)' },
  headerDecoration2: { position: 'absolute', top: 60, right: 30, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.05)' },
  headerDecoration3: { position: 'absolute', bottom: -30, left: -30, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.06)' },
  headerContent: { paddingHorizontal: 20, zIndex: 1 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backButtonInner: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3 },
  backButtonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  headerIconContainer: { alignItems: 'center' },
  headerIconBg: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  headerTitleSection: { marginBottom: 20 },
  title: { color: '#fff', fontSize: 26, fontWeight: 'bold' },
  subtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 14, marginTop: 4 },
  headerMiniStats: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 16, padding: 14, alignItems: 'center', justifyContent: 'space-around', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  miniStatItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  miniStatIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(204, 95, 42, 0.1)', alignItems: 'center', justifyContent: 'center' },
  miniStatValue: { fontSize: 14, fontWeight: 'bold', color: '#CC5F2A' },
  miniStatLabel: { fontSize: 10, color: '#666', marginTop: 1 },
  miniStatDivider: { width: 1, height: 30, backgroundColor: '#e5e7eb' },
  statsScroll: { maxHeight: 100 },
  statsContainer: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16 },
  statCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginRight: 12, minWidth: 80, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  statNumber: { fontSize: 20, fontWeight: 'bold', color: '#CC5F2A' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 4, textAlign: 'center' },
  filtersSection: { paddingTop: 16, paddingBottom: 8 },
  filtersTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, marginBottom: 12 },
  filtersTitle: { fontSize: 15, fontWeight: '600', color: '#CC5F2A' },
  filtersScroll: { paddingLeft: 20 },
  filtersContainer: { flexDirection: 'row', paddingRight: 20, gap: 10 },
  filterChip: { backgroundColor: '#fff', borderRadius: 25, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1.5, borderColor: 'rgba(204, 95, 42, 0.15)', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  filterChipActive: { backgroundColor: '#CC5F2A', borderColor: '#CC5F2A', shadowOpacity: 0.15 },
  filterChipContent: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  filterChipText: { fontSize: 13, color: '#CC5F2A', fontWeight: '600' },
  filterChipTextActive: { color: '#fff' },
  filterChipBadge: { backgroundColor: 'rgba(204, 95, 42, 0.1)', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, minWidth: 22, alignItems: 'center' },
  filterChipBadgeActive: { backgroundColor: 'rgba(255, 255, 255, 0.25)' },
  filterChipBadgeText: { fontSize: 11, fontWeight: 'bold', color: '#CC5F2A' },
  filterChipBadgeTextActive: { color: '#fff' },
  listContainer: { paddingBottom: 40 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#f8fafc' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1e293b' },
  sectionCount: { fontSize: 13, color: '#CC5F2A', backgroundColor: 'rgba(204, 95, 42, 0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, fontWeight: '600' },
  itemSeparator: { height: 14 },
  reservationCard: { marginHorizontal: 16, borderRadius: 20, overflow: 'hidden', shadowColor: '#CC5F2A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 5, backgroundColor: '#fff' },
  cardGradient: { padding: 0 },
  cardStatusBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  cardStatusIndicator: { width: 8, height: 8, borderRadius: 4 },
  cardStatusText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardReservaNum: { marginLeft: 'auto', fontSize: 12, color: '#64748b', fontWeight: '500' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 12, gap: 14 },
  serviceIconContainer: {},
  serviceIcon: { width: 54, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { flex: 1 },
  serviceName: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 4, lineHeight: 20 },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  vehicleInfo: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  priceContainer: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: 'rgba(204, 95, 42, 0.08)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  priceCurrency: { fontSize: 12, color: '#CC5F2A', fontWeight: '600', marginTop: 2 },
  priceAmount: { fontSize: 18, color: '#CC5F2A', fontWeight: 'bold' },
  cardDivider: { height: 1, backgroundColor: '#f1f5f9', marginHorizontal: 16 },
  cardInfoSection: { flexDirection: 'row', padding: 16, gap: 12 },
  infoCard: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, gap: 10 },
  infoCardIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(204, 95, 42, 0.1)', alignItems: 'center', justifyContent: 'center' },
  infoCardContent: { flex: 1 },
  infoCardLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 },
  infoCardValue: { fontSize: 14, color: '#1e293b', fontWeight: '600' },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  clientPhone: { fontSize: 11, color: '#94a3b8' },
  qrButton: { marginHorizontal: 16, marginBottom: 16, borderRadius: 14, overflow: 'hidden' },
  qrButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 10 },
  qrButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  disabledButton: { opacity: 0.5 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  loadingText: { marginTop: 12, fontSize: 16, color: '#666' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: '#666', textAlign: 'center', paddingHorizontal: 40 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  errorIcon: { fontSize: 48, marginBottom: 16 },
  errorText: { fontSize: 16, color: '#dc3545', textAlign: 'center', paddingHorizontal: 40, marginBottom: 16 },
  retryButton: { backgroundColor: '#CC5F2A', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryButtonText: { color: '#fff', fontWeight: '600' },
  qrInfoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 },
  // Estilos para el modal QR
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: width - 48, maxWidth: 380, alignItems: 'center' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#CC5F2A' },
  modalCloseButton: { padding: 8 },
  modalCloseText: { fontSize: 24, color: '#666' },
  qrInfo: { backgroundColor: '#FFF8F5', padding: 16, borderRadius: 12, width: '100%', marginBottom: 20 },
  qrInfoText: { fontSize: 16, fontWeight: '600', color: '#333', textAlign: 'center', marginBottom: 4 },
  qrInfoSubtext: { fontSize: 14, color: '#666', textAlign: 'center' },
  qrContainer: { padding: 20, backgroundColor: '#fff', borderRadius: 16, borderWidth: 2, borderColor: '#CC5F2A', marginBottom: 20 },
  qrInstruction: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  modalCloseMainButton: { backgroundColor: '#CC5F2A', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12, width: '100%' },
  modalCloseMainButtonText: { color: '#fff', fontWeight: '600', fontSize: 16, textAlign: 'center' },
  // Estilos para filtro de vencidas
  filterChipExpired: { borderColor: '#E67E22', backgroundColor: '#FFF8F0' },
  filterChipExpiredActive: { backgroundColor: '#E67E22', borderColor: '#E67E22' },
  filterChipTextExpired: { color: '#E67E22' },
  filterChipBadgeExpired: { backgroundColor: 'rgba(230, 126, 34, 0.15)' },
  filterChipBadgeExpiredActive: { backgroundColor: 'rgba(255, 255, 255, 0.25)' },
  filterChipBadgeTextExpired: { color: '#E67E22' },
  // Estilos para mensaje de reserva vencida
  expiredMessageContainer: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 16, backgroundColor: '#FFF8F0', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#F5B041', gap: 12 },
  expiredMessageIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(230, 126, 34, 0.15)', alignItems: 'center', justifyContent: 'center' },
  expiredMessageContent: { flex: 1 },
  expiredMessageTitle: { fontSize: 14, fontWeight: '700', color: '#E67E22', marginBottom: 4 },
  expiredMessageText: { fontSize: 12, color: '#B7791A', lineHeight: 18 },
  // Estilos para modal de confirmación exitosa
  successModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.75)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  successModalContainer: { width: width * 0.85, maxWidth: 350, borderRadius: 28, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 15 }, shadowOpacity: 0.5, shadowRadius: 25, elevation: 25 },
  successModalGradient: { padding: 35, alignItems: 'center', position: 'relative', overflow: 'hidden' },
  successCircle1: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255, 255, 255, 0.1)', top: -60, right: -60 },
  successCircle2: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255, 255, 255, 0.08)', bottom: -40, left: -40 },
  successIconContainer: { marginBottom: 20 },
  successIconOuter: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255, 255, 255, 0.25)', justifyContent: 'center', alignItems: 'center' },
  successIconInner: { width: 75, height: 75, borderRadius: 37.5, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 10 },
  successTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 8, textShadowColor: 'rgba(0, 0, 0, 0.2)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  successSubtitle: { fontSize: 15, color: 'rgba(255, 255, 255, 0.9)', textAlign: 'center', marginBottom: 20 },
  successDetails: { backgroundColor: 'rgba(255, 255, 255, 0.15)', borderRadius: 12, padding: 14, width: '100%', marginBottom: 20 },
  successDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  successDetailText: { color: '#fff', fontSize: 14, fontWeight: '500', flex: 1 },
  successPriceContainer: { backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 12, padding: 16, alignItems: 'center', width: '100%' },
  successPriceLabel: { color: 'rgba(255, 255, 255, 0.85)', fontSize: 13, marginBottom: 4 },
  successPriceValue: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  ratingContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  ratingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  ratingLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  starsRow: {
    flexDirection: 'row',
  },
  ratingComment: {
    fontSize: 13,
    color: '#334155',
    fontStyle: 'italic',
    marginTop: 4,
  },
});