import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList, Modal, TextInput, SectionList, ActivityIndicator, Alert, RefreshControl, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { getReservasUsuario, Reserva, getUser, verificarYCompletarReservaQR, cancelarReserva, getHorariosDisponibles, reagendarReserva } from '../services/api';

export default function MyAppointments() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');

  const [selected, setSelected] = useState<Reserva | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  
  // Estados para reagendar con selector visual
  const [showReschedule, setShowReschedule] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [availableDates, setAvailableDates] = useState<{id: string, display: string, dayName: string, dayNum: number, month: string, isToday: boolean, isTomorrow: boolean}[]>([]);
  const [horariosDisponibles, setHorariosDisponibles] = useState<string[]>([]);
  const [todosLosHorarios, setTodosLosHorarios] = useState<{hora: string, disponible: boolean, ocupado: boolean, pasado: boolean}[]>([]);
  const [loadingHorarios, setLoadingHorarios] = useState(false);
  const [esHoy, setEsHoy] = useState(false);

  // Estados para el escáner QR
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  // Estados para modales personalizados de tiempo
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [timeModalType, setTimeModalType] = useState<'edit' | 'cancel' | 'editConfirm'>('edit');
  const [timeModalData, setTimeModalData] = useState<{
    canProceed: boolean;
    hoursRemaining: number;
    reserva: Reserva | null;
  }>({ canProceed: false, hoursRemaining: 0, reserva: null });

  // Estados para modal de confirmación de cancelación
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReserva, setCancelReserva] = useState<Reserva | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Estados para modal de resultado (éxito o error)
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultModalType, setResultModalType] = useState<'success' | 'error'>('success');
  const [resultModalMessage, setResultModalMessage] = useState('');

  const fetchReservations = async () => {
    console.log('--- Iniciando fetchReservations ---');
    try {
      const user = await getUser();
      console.log('Usuario obtenido de AsyncStorage:', user);
      
      if (!user) {
        console.log('No hay usuario, abortando fetch');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      console.log('Llamando a getReservasUsuario con ID:', user.id || (user as any).id_usuario);
      const userId = user.id || (user as any).id_usuario;
      
      if (!userId) {
        console.error('ID de usuario no encontrado en el objeto user:', user);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const response = await getReservasUsuario(userId);
      console.log('Respuesta de getReservasUsuario:', JSON.stringify(response, null, 2));
      
      if (response.success && response.data) {
        console.log('Reservas encontradas:', response.data.reservas.length);
        setAppointments(response.data.reservas);
      } else {
        console.error('Error fetching reservations:', response.message);
      }
    } catch (error) {
      console.error('Error al cargar reservas:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      console.log('--- Fin fetchReservations ---');
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchReservations();
  }, []);

  const sections = useMemo(() => {
    // Incluir 'en_proceso' en próximas y ambas variantes de completado en historial
    const upcoming = appointments.filter(a => 
      a.estado === 'pendiente' || a.estado === 'confirmada' || a.estado === 'en_proceso'
    );
    const past = appointments.filter(a => 
      a.estado === 'completada' || a.estado === 'completado' || a.estado === 'cancelada'
    );
    
    if (activeTab === 'upcoming') {
      return upcoming.length > 0 ? [{ title: 'Próximas', data: upcoming }] : [];
    } else {
      return past.length > 0 ? [{ title: 'Historial', data: past }] : [];
    }
  }, [appointments, activeTab]);

  const openDetails = (item: Reserva) => {
    setSelected(item);
    setShowDetails(true);
  };

  const closeDetails = () => {
    setSelected(null);
    setShowDetails(false);
  };

  // Función para verificar si se puede cancelar (12 horas antes)
  const canCancelReservation = (reserva: Reserva): { canCancel: boolean; hoursRemaining: number } => {
    // Extraer solo la fecha (YYYY-MM-DD) sin la parte de tiempo
    const fechaStr = reserva.fecha.toString().split('T')[0];
    // Extraer solo HH:MM de la hora
    const horaStr = reserva.hora.toString().substring(0, 5);
    
    const fechaReserva = new Date(`${fechaStr}T${horaStr}:00`);
    const ahora = new Date();
    const diferenciaMs = fechaReserva.getTime() - ahora.getTime();
    const horasRestantes = diferenciaMs / (1000 * 60 * 60);
    
    console.log('[CANCEL] Fecha reserva:', fechaStr, 'Hora:', horaStr);
    console.log('[CANCEL] Fecha parseada:', fechaReserva.toISOString());
    console.log('[CANCEL] Horas restantes:', horasRestantes);
    
    return {
      canCancel: horasRestantes >= 12,
      hoursRemaining: Math.max(0, Math.floor(horasRestantes))
    };
  };

  const handleCancel = async (reserva: Reserva) => {
    const { canCancel, hoursRemaining } = canCancelReservation(reserva);
    
    if (!canCancel) {
      setTimeModalData({
        canProceed: false,
        hoursRemaining,
        reserva
      });
      setTimeModalType('cancel');
      setShowTimeModal(true);
      return;
    }

    // Mostrar modal de confirmación
    setCancelReserva(reserva);
    setShowCancelConfirm(true);
  };

  const confirmCancelReservation = async () => {
    if (!cancelReserva) return;
    
    try {
      setCancelLoading(true);
      const user = await getUser();
      if (!user) {
        setShowCancelConfirm(false);
        setResultModalType('error');
        setResultModalMessage('No se pudo obtener la información del usuario');
        setShowResultModal(true);
        return;
      }
      
      const userId = user.id || (user as any).id_usuario;
      const response = await cancelarReserva(cancelReserva.id_reserva, userId);
      
      setShowCancelConfirm(false);
      
      if (response.success) {
        setResultModalType('success');
        setResultModalMessage('Tu reserva ha sido cancelada correctamente');
        setShowResultModal(true);
      } else {
        setResultModalType('error');
        setResultModalMessage(response.message || 'No se pudo cancelar la reserva');
        setShowResultModal(true);
      }
    } catch (error) {
      console.error('Error al cancelar reserva:', error);
      setShowCancelConfirm(false);
      setResultModalType('error');
      setResultModalMessage('Ocurrió un error al cancelar la reserva');
      setShowResultModal(true);
    } finally {
      setCancelLoading(false);
      closeDetails();
    }
  };

  const handleResultModalClose = () => {
    setShowResultModal(false);
    if (resultModalType === 'success') {
      fetchReservations();
    }
  };

  // Función para verificar si se puede editar (6 horas antes)
  const canEditReservation = (reserva: Reserva): { canEdit: boolean; hoursRemaining: number } => {
    // Extraer solo la fecha (YYYY-MM-DD) sin la parte de tiempo
    const fechaStr = reserva.fecha.toString().split('T')[0];
    // Extraer solo HH:MM de la hora
    const horaStr = reserva.hora.toString().substring(0, 5);
    
    const fechaReserva = new Date(`${fechaStr}T${horaStr}:00`);
    const ahora = new Date();
    const diferenciaMs = fechaReserva.getTime() - ahora.getTime();
    const horasRestantes = diferenciaMs / (1000 * 60 * 60);
    
    console.log('[EDIT] Fecha reserva:', fechaStr, 'Hora:', horaStr);
    console.log('[EDIT] Fecha parseada:', fechaReserva.toISOString());
    console.log('[EDIT] Horas restantes:', horasRestantes);
    
    return {
      canEdit: horasRestantes >= 6,
      hoursRemaining: Math.max(0, Math.floor(horasRestantes))
    };
  };

  const startReschedule = (item: Reserva) => {
    const { canEdit, hoursRemaining } = canEditReservation(item);
    
    setTimeModalData({
      canProceed: canEdit,
      hoursRemaining,
      reserva: item
    });
    setTimeModalType(canEdit ? 'editConfirm' : 'edit');
    setShowTimeModal(true);
  };

  // Generar fechas disponibles (próximos 10 días)
  const generarFechasDisponibles = useCallback(() => {
    const fechas = [];
    const hoy = new Date();
    const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    for (let i = 0; i <= 10; i++) {
      const fecha = new Date(hoy);
      fecha.setDate(hoy.getDate() + i);
      
      const fechaISO = fecha.toISOString().split('T')[0];
      fechas.push({
        id: fechaISO,
        display: `${diasSemana[fecha.getDay()]} ${fecha.getDate()} ${meses[fecha.getMonth()]}`,
        dayName: diasSemana[fecha.getDay()],
        dayNum: fecha.getDate(),
        month: meses[fecha.getMonth()],
        isToday: i === 0,
        isTomorrow: i === 1
      });
    }
    return fechas;
  }, []);

  // Cargar horarios disponibles del backend
  const cargarHorariosDisponibles = async (empresaId: number, fecha: string) => {
    try {
      setLoadingHorarios(true);
      console.log('[RESCHEDULE] Cargando horarios para empresa:', empresaId, 'fecha:', fecha);
      
      const response = await getHorariosDisponibles(empresaId, fecha);
      console.log('[RESCHEDULE] Respuesta horarios:', JSON.stringify(response));
      
      if (response.success) {
        // Los datos vienen directamente en la respuesta, no en response.data
        const data = response as any;
        const horariosDisp = data.horariosDisponibles || data.data?.horariosDisponibles || [];
        const todosHorarios = data.todosLosHorarios || data.data?.todosLosHorarios || 
          horariosDisp.map((h: string) => ({
            hora: h,
            disponible: true,
            ocupado: false,
            pasado: false
          }));
        const esHoyFlag = data.esHoy || data.data?.esHoy || false;
        
        console.log('[RESCHEDULE] Horarios disponibles:', horariosDisp.length);
        console.log('[RESCHEDULE] Todos los horarios:', todosHorarios.length);
        
        setHorariosDisponibles(horariosDisp);
        setTodosLosHorarios(todosHorarios);
        setEsHoy(esHoyFlag);
      } else {
        console.log('[RESCHEDULE] Response no success:', response);
        setHorariosDisponibles([]);
        setTodosLosHorarios([]);
      }
    } catch (error) {
      console.error('[RESCHEDULE] Error cargando horarios:', error);
      setHorariosDisponibles([]);
      setTodosLosHorarios([]);
    } finally {
      setLoadingHorarios(false);
    }
  };

  const proceedWithReschedule = () => {
    if (timeModalData.reserva) {
      setSelected(timeModalData.reserva);
      // Generar fechas disponibles
      const fechas = generarFechasDisponibles();
      console.log('[RESCHEDULE] Fechas generadas:', fechas.length);
      setAvailableDates(fechas);
      // Limpiar selecciones previas
      setNewDate('');
      setNewTime('');
      setHorariosDisponibles([]);
      setTodosLosHorarios([]);
      setShowTimeModal(false);
      setShowReschedule(true);
    }
  };

  // Cuando se selecciona una fecha, cargar horarios
  const handleDateSelect = async (dateId: string) => {
    setNewDate(dateId);
    setNewTime(''); // Limpiar hora seleccionada
    
    if (selected) {
      await cargarHorariosDisponibles(selected.empresa_id, dateId);
    }
  };

  const confirmReschedule = async () => {
    if (!newDate || !newTime || !selected) {
      Alert.alert('Error', 'Por favor selecciona fecha y hora');
      return;
    }

    try {
      setLoading(true);
      const user = await getUser();
      if (!user) {
        Alert.alert('Error', 'No se pudo obtener información del usuario');
        return;
      }

      console.log('[RESCHEDULE] Reagendando reserva:', selected.id_reserva, 'a', newDate, newTime);
      
      const response = await reagendarReserva(
        selected.id_reserva,
        newDate,
        newTime,
        user.id
      );

      if (response.success) {
        Alert.alert(
          '¡Listo!',
          'Tu cita ha sido reagendada exitosamente',
          [{ text: 'OK', onPress: () => fetchReservations() }]
        );
      } else {
        Alert.alert('Error', response.message || 'No se pudo reagendar la reserva');
      }
    } catch (error) {
      console.error('[RESCHEDULE] Error:', error);
      Alert.alert('Error', 'Ocurrió un error al reagendar la reserva');
    } finally {
      setLoading(false);
      setShowReschedule(false);
      setSelected(null);
      setNewDate('');
      setNewTime('');
    }
  };

  const getServiceIcon = (nombreServicio: string): keyof typeof Ionicons.glyphMap => {
    if (nombreServicio.toLowerCase().includes('lavado')) return 'car-outline';
    if (nombreServicio.toLowerCase().includes('desinfección')) return 'sparkles-outline';
    return 'construct-outline';
  };

  // Función para abrir el escáner QR
  const openQRScanner = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          'Permiso requerido',
          'Necesitamos acceso a la cámara para escanear códigos QR',
          [{ text: 'OK' }]
        );
        return;
      }
    }
    setScannedData(null);
    setShowQRScanner(true);
  };

  // Función que se llama cuando se escanea un QR
  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scannedData || verifying) return; // Evitar escaneos múltiples
    
    setScannedData(data);
    setVerifying(true);
    
    try {
      console.log('QR escaneado:', data);
      
      // Intentar parsear el JSON del QR
      let qrData: any;
      try {
        qrData = JSON.parse(data);
      } catch {
        // Si no es JSON, asumir que es solo el número de reserva
        qrData = { numero_reserva: data };
      }
      
      // Preparar datos para enviar - usar numero_reserva si existe, sino usar id_reserva
      const requestData: { numero_reserva?: string; id_reserva?: number } = {};
      
      if (qrData.numero_reserva) {
        requestData.numero_reserva = qrData.numero_reserva;
      } else if (qrData.id_reserva) {
        requestData.id_reserva = qrData.id_reserva;
      } else {
        // Si no hay ninguno, usar el data crudo como numero_reserva
        requestData.numero_reserva = data;
      }
      
      console.log('Datos a verificar:', requestData);
      
      const response = await verificarYCompletarReservaQR(requestData as any);
      
      const displayNumero = qrData.numero_reserva || `#${qrData.id_reserva}` || data;
      
      if (response.success) {
        Alert.alert(
          'Servicio Completado',
          `Tu reserva ${displayNumero} ha sido marcada como completada.\n\n¡Gracias por usar nuestro servicio!`,
          [
            { 
              text: 'OK', 
              onPress: () => {
                setShowQRScanner(false);
                fetchReservations(); // Recargar reservas
              }
            }
          ]
        );
      } else {
        Alert.alert(
          'Error',
          response.message || 'No se pudo verificar la reserva. Asegúrate de escanear el QR correcto.',
          [
            { 
              text: 'Reintentar', 
              onPress: () => {
                setScannedData(null);
                setVerifying(false);
              }
            },
            {
              text: 'Cerrar',
              onPress: () => setShowQRScanner(false),
              style: 'cancel'
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error al verificar QR:', error);
      Alert.alert(
        'Error',
        'Ocurrió un error al procesar el código QR. Por favor intenta de nuevo.',
        [
          { 
            text: 'Reintentar', 
            onPress: () => {
              setScannedData(null);
              setVerifying(false);
            }
          },
          {
            text: 'Cerrar',
            onPress: () => setShowQRScanner(false),
            style: 'cancel'
          }
        ]
      );
    } finally {
      setVerifying(false);
    }
  };

  const renderItem = ({ item }: { item: Reserva }) => {
    // Obtener el nombre del primer servicio o "Varios servicios"
    const nombreServicio = item.servicios && item.servicios.length > 0 
      ? item.servicios[0].nombre_servicio 
      : 'Servicio de Lavado';
    
    const fechaObj = new Date(item.fecha);
    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const diaNum = fechaObj.getDate();
    const diaNombre = diasSemana[fechaObj.getDay()];
    const mes = meses[fechaObj.getMonth()];
    
    const isPending = item.estado === 'pendiente' || item.estado === 'confirmada' || item.estado === 'en_proceso';
    const isCompleted = item.estado === 'completada' || item.estado === 'completado';
    const isCancelled = item.estado === 'cancelada';
    
    const getStatusConfig = () => {
      if (isPending) return { bg: '#FFF8E1', color: '#F9A825', icon: 'time-outline' as const, text: 'Pendiente' };
      if (isCompleted) return { bg: '#E8F5E9', color: '#43A047', icon: 'checkmark-circle' as const, text: 'Completada' };
      return { bg: '#FFEBEE', color: '#E53935', icon: 'close-circle' as const, text: 'Cancelada' };
    };
    
    const statusConfig = getStatusConfig();
    
    return (
      <TouchableOpacity style={styles.appointmentCard} onPress={() => openDetails(item)} activeOpacity={0.7}>
        {/* Fecha destacada a la izquierda */}
        <View style={[styles.cardDateSection, { borderLeftColor: statusConfig.color }]}>
          <Text style={styles.cardDateDay}>{diaNum}</Text>
          <Text style={styles.cardDateMonth}>{mes}</Text>
          <Text style={styles.cardDateWeekday}>{diaNombre.substring(0, 3)}</Text>
        </View>
        
        {/* Contenido principal */}
        <View style={styles.cardMainContent}>
          {/* Header con servicio y estado */}
          <View style={styles.cardHeader}>
            <View style={styles.cardServiceInfo}>
              <View style={styles.cardServiceIconContainer}>
                <Ionicons name={getServiceIcon(nombreServicio)} size={18} color="#0C553C" />
              </View>
              <Text style={styles.cardServiceName} numberOfLines={1}>
                {nombreServicio} {item.servicios && item.servicios.length > 1 ? `+${item.servicios.length - 1}` : ''}
              </Text>
            </View>
            <View style={[styles.cardStatusBadge, { backgroundColor: statusConfig.bg }]}>
              <Ionicons name={statusConfig.icon} size={12} color={statusConfig.color} />
              <Text style={[styles.cardStatusText, { color: statusConfig.color }]}>{statusConfig.text}</Text>
            </View>
          </View>
          
          {/* Información de empresa y hora */}
          <View style={styles.cardDetailsRow}>
            <View style={styles.cardDetailItem}>
              <Ionicons name="business-outline" size={14} color="#666" />
              <Text style={styles.cardDetailText} numberOfLines={1}>{item.nombre_empresa}</Text>
            </View>
          </View>
          <View style={styles.cardDetailsRow}>
            <View style={styles.cardDetailItem}>
              <Ionicons name="time-outline" size={14} color="#666" />
              <Text style={styles.cardDetailText}>{item.hora.toString().substring(0, 5)}</Text>
            </View>
            {item.total && (
              <View style={styles.cardDetailItem}>
                <Ionicons name="card-outline" size={14} color="#0C553C" />
                <Text style={[styles.cardDetailText, { color: '#0C553C', fontWeight: '700' }]}>
                  ${parseFloat(item.total.toString()).toLocaleString()}
                </Text>
              </View>
            )}
          </View>
          
          {/* Acciones para citas pendientes */}
          {isPending && (
            <View style={styles.cardActionsRow}>
              <TouchableOpacity style={styles.cardActionBtnQR} onPress={openQRScanner} activeOpacity={0.7}>
                <Ionicons name="qr-code-outline" size={14} color="#fff" />
                <Text style={styles.cardActionBtnQRText}>QR</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cardActionBtnEdit} onPress={() => startReschedule(item)} activeOpacity={0.7}>
                <Ionicons name="create-outline" size={14} color="#0C553C" />
                <Text style={styles.cardActionBtnEditText}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cardActionBtnCancel} onPress={() => handleCancel(item)} activeOpacity={0.7}>
                <Ionicons name="trash-outline" size={14} color="#E53935" />
                <Text style={styles.cardActionBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section: { title } }: any) => (
    <Text style={styles.sectionHeader}>{title}</Text>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#0C553C" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity 
            onPress={() => router.replace('./client-dashboard')} 
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <View style={styles.backButtonIcon}>
              <Ionicons name="chevron-back" size={20} color="#fff" />
            </View>
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={styles.title}>Mis Citas</Text>
            <Text style={styles.headerSubtitle}>Gestiona tus reservas</Text>
          </View>
          
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerRefreshBtn} onPress={() => fetchReservations()} activeOpacity={0.7}>
              <Ionicons name="refresh-outline" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        {/* Tabs mejoradas */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'upcoming' && styles.tabActive]}
            onPress={() => setActiveTab('upcoming')}
            activeOpacity={0.7}
          >
            <View style={[styles.tabIconContainer, activeTab === 'upcoming' && styles.tabIconContainerActive]}>
              <Ionicons 
                name="calendar-outline" 
                size={20} 
                color={activeTab === 'upcoming' ? '#fff' : '#0C553C'} 
              />
            </View>
            <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>Próximas</Text>
            {appointments.filter(a => ['pendiente', 'confirmada', 'en_proceso'].includes(a.estado)).length > 0 && (
              <View style={[styles.tabBadge, activeTab === 'upcoming' && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, activeTab === 'upcoming' && styles.tabBadgeTextActive]}>
                  {appointments.filter(a => ['pendiente', 'confirmada', 'en_proceso'].includes(a.estado)).length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'history' && styles.tabActive]}
            onPress={() => setActiveTab('history')}
            activeOpacity={0.7}
          >
            <View style={[styles.tabIconContainer, activeTab === 'history' && styles.tabIconContainerActive]}>
              <Ionicons 
                name="checkmark-done-outline" 
                size={20} 
                color={activeTab === 'history' ? '#fff' : '#0C553C'} 
              />
            </View>
            <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>Historial</Text>
          </TouchableOpacity>
        </View>
        
        {sections.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {activeTab === 'upcoming' 
                ? 'No tienes citas próximas' 
                : 'No tienes historial de citas'}
            </Text>
            {activeTab === 'upcoming' && (
              <TouchableOpacity 
                style={styles.bookButton}
                onPress={() => router.push('./book-appointment')}
              >
                <Text style={styles.bookButtonText}>Reservar Ahora</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={item => item.id_reserva.toString()}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0C553C']} />
            }
          />
        )}
      </View>

      {/* Details Modal - Diseño Mejorado */}
      <Modal visible={showDetails} animationType="slide" transparent>
        <View style={styles.detailModalOverlay}>
          <View style={styles.detailModalCard}>
            {selected && (
              <>
                {/* Header con estado */}
                <View style={[
                  styles.detailModalHeader,
                  { backgroundColor: 
                    (selected.estado === 'completada' || selected.estado === 'completado') ? '#E8F5E9' :
                    (selected.estado === 'cancelada') ? '#FFEBEE' : '#FFF8E1'
                  }
                ]}>
                  <View style={styles.detailModalHeaderContent}>
                    <View style={[
                      styles.detailModalStatusIcon,
                      { backgroundColor: 
                        (selected.estado === 'completada' || selected.estado === 'completado') ? '#43A047' :
                        (selected.estado === 'cancelada') ? '#E53935' : '#F9A825'
                      }
                    ]}>
                      <Ionicons 
                        name={
                          (selected.estado === 'completada' || selected.estado === 'completado') ? 'checkmark-circle' :
                          (selected.estado === 'cancelada') ? 'close-circle' : 'time'
                        } 
                        size={32} 
                        color="#fff" 
                      />
                    </View>
                    <View style={styles.detailModalHeaderText}>
                      <Text style={styles.detailModalStatusLabel}>Estado de la cita</Text>
                      <Text style={[
                        styles.detailModalStatusValue,
                        { color: 
                          (selected.estado === 'completada' || selected.estado === 'completado') ? '#2E7D32' :
                          (selected.estado === 'cancelada') ? '#C62828' : '#F57F17'
                        }
                      ]}>
                        {selected.estado === 'completada' || selected.estado === 'completado' ? 'Completada' :
                         selected.estado === 'cancelada' ? 'Cancelada' : 'Pendiente'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.detailModalCloseBtn}
                    onPress={closeDetails}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                {/* Contenido principal */}
                <ScrollView style={styles.detailModalContent} showsVerticalScrollIndicator={false}>
                  {/* Número de reserva */}
                  {(selected as any).numero_reserva && (
                    <View style={styles.detailReservaNumber}>
                      <Text style={styles.detailReservaNumberLabel}>Nº Reserva</Text>
                      <Text style={styles.detailReservaNumberValue}>#{(selected as any).numero_reserva}</Text>
                    </View>
                  )}

                  {/* Fecha y hora destacadas */}
                  <View style={styles.detailDateTimeCard}>
                    <View style={styles.detailDateSection}>
                      <Ionicons name="calendar" size={24} color="#0C553C" />
                      <View style={styles.detailDateInfo}>
                        <Text style={styles.detailDateLabel}>Fecha</Text>
                        <Text style={styles.detailDateValue}>
                          {new Date(selected.fecha).toLocaleDateString('es-ES', { 
                            weekday: 'long', 
                            day: 'numeric', 
                            month: 'long',
                            year: 'numeric'
                          })}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.detailDateDivider} />
                    <View style={styles.detailTimeSection}>
                      <Ionicons name="time" size={24} color="#0C553C" />
                      <View style={styles.detailTimeInfo}>
                        <Text style={styles.detailTimeLabel}>Hora</Text>
                        <Text style={styles.detailTimeValue}>{selected.hora.toString().substring(0, 5)}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Empresa */}
                  <View style={styles.detailSection}>
                    <View style={styles.detailSectionHeader}>
                      <Ionicons name="business" size={20} color="#0C553C" />
                      <Text style={styles.detailSectionTitle}>Empresa</Text>
                    </View>
                    <View style={styles.detailSectionContent}>
                      <Text style={styles.detailEmpresaName}>{selected.nombre_empresa}</Text>
                      {selected.direccion_empresa && (
                        <View style={styles.detailInfoRow}>
                          <Ionicons name="location-outline" size={16} color="#666" />
                          <Text style={styles.detailInfoText}>{selected.direccion_empresa}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Servicios */}
                  <View style={styles.detailSection}>
                    <View style={styles.detailSectionHeader}>
                      <Ionicons name="construct" size={20} color="#0C553C" />
                      <Text style={styles.detailSectionTitle}>Servicios</Text>
                    </View>
                    <View style={styles.detailServiciosList}>
                      {selected.servicios?.map((servicio, index) => (
                        <View key={index} style={styles.detailServicioItem}>
                          <View style={styles.detailServicioIcon}>
                            <Ionicons name="checkmark-circle" size={18} color="#43A047" />
                          </View>
                          <View style={styles.detailServicioInfo}>
                            <Text style={styles.detailServicioName}>{servicio.nombre_servicio}</Text>
                            <Text style={styles.detailServicioPrice}>
                              ${parseFloat(servicio.precio?.toString() || '0').toLocaleString()}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Total */}
                  <View style={styles.detailTotalCard}>
                    <View style={styles.detailTotalRow}>
                      <Text style={styles.detailTotalLabel}>Total pagado</Text>
                      <Text style={styles.detailTotalValue}>
                        ${parseFloat(selected.total?.toString() || '0').toLocaleString()}
                      </Text>
                    </View>
                  </View>
                </ScrollView>

                {/* Botones de acción */}
                <View style={styles.detailModalButtons}>
                  {(selected.estado === 'pendiente' || selected.estado === 'confirmada' || selected.estado === 'en_proceso') && (
                    <>
                      <TouchableOpacity 
                        style={styles.detailBtnEdit}
                        onPress={() => {
                          closeDetails();
                          startReschedule(selected);
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="create-outline" size={18} color="#0C553C" />
                        <Text style={styles.detailBtnEditText}>Editar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.detailBtnCancel}
                        onPress={() => handleCancel(selected)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash-outline" size={18} color="#E53935" />
                        <Text style={styles.detailBtnCancelText}>Cancelar</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  <TouchableOpacity 
                    style={styles.detailBtnClose}
                    onPress={closeDetails}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.detailBtnCloseText}>Cerrar</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Reschedule Modal - Diseño Mejorado */}
      <Modal 
        visible={showReschedule} 
        animationType="slide" 
        transparent={true}
        onRequestClose={() => { setShowReschedule(false); setSelected(null); }}
      >
        <View style={styles.rescheduleModalOverlay}>
          <View style={styles.rescheduleModalCard}>
            {/* Header */}
            <View style={styles.rescheduleHeader}>
              <View style={styles.rescheduleHeaderIcon}>
                <Ionicons name="calendar" size={24} color="#fff" />
              </View>
              <Text style={styles.rescheduleTitle}>Reagendar Cita</Text>
              <TouchableOpacity 
                style={styles.rescheduleCloseBtn}
                onPress={() => { setShowReschedule(false); setSelected(null); }}
                activeOpacity={0.6}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Info de la reserva actual */}
            {selected && (
              <View style={styles.rescheduleCurrentInfo}>
                <Text style={styles.rescheduleCurrentTitle}>Cita actual:</Text>
                <View style={styles.rescheduleCurrentRow}>
                  <Ionicons name="business-outline" size={16} color="#0C553C" />
                  <Text style={styles.rescheduleCurrentText}>{selected.nombre_empresa}</Text>
                </View>
                <View style={styles.rescheduleCurrentRow}>
                  <Ionicons name="construct-outline" size={16} color="#0C553C" />
                  <Text style={styles.rescheduleCurrentText} numberOfLines={1}>
                    {selected.servicios?.map(s => s.nombre_servicio).join(', ')}
                  </Text>
                </View>
              </View>
            )}

            <ScrollView 
              style={styles.rescheduleContent} 
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              {/* Selector de Fecha */}
              <View style={styles.rescheduleSectionContainer}>
                <View style={styles.rescheduleSectionHeader}>
                  <View style={[styles.rescheduleSectionNumber, newDate ? styles.rescheduleSectionNumberActive : null]}>
                    <Text style={[styles.rescheduleSectionNumberText, newDate ? styles.rescheduleSectionNumberTextActive : null]}>1</Text>
                  </View>
                  <Text style={styles.rescheduleSectionTitle}>Selecciona la nueva fecha</Text>
                </View>

                {availableDates.length > 0 ? (
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    nestedScrollEnabled={true}
                    contentContainerStyle={styles.rescheduleDatesContainer}
                  >
                    {availableDates.map((date) => (
                      <TouchableOpacity
                        key={date.id}
                        style={[
                          styles.rescheduleDateCard,
                          newDate === date.id && styles.rescheduleDateCardSelected,
                          date.isToday && styles.rescheduleDateCardToday
                        ]}
                        onPress={() => handleDateSelect(date.id)}
                        activeOpacity={0.7}
                      >
                        {date.isToday && (
                          <View style={[styles.rescheduleDateBadge, newDate === date.id && styles.rescheduleDateBadgeSelected]}>
                            <Text style={[styles.rescheduleDateBadgeText, newDate === date.id && styles.rescheduleDateBadgeTextSelected]}>Hoy</Text>
                          </View>
                        )}
                        {date.isTomorrow && (
                          <View style={[styles.rescheduleDateBadge, newDate === date.id && styles.rescheduleDateBadgeSelected]}>
                            <Text style={[styles.rescheduleDateBadgeText, newDate === date.id && styles.rescheduleDateBadgeTextSelected]}>Mañana</Text>
                          </View>
                        )}
                        <Text style={[styles.rescheduleDateDayName, newDate === date.id && styles.rescheduleDateTextSelected]}>
                          {date.dayName}
                        </Text>
                        <Text style={[styles.rescheduleDateDayNum, newDate === date.id && styles.rescheduleDateTextSelected]}>
                          {date.dayNum}
                        </Text>
                        <Text style={[styles.rescheduleDateMonth, newDate === date.id && styles.rescheduleDateTextSelected]}>
                          {date.month}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={styles.rescheduleLoadingContainer}>
                    <ActivityIndicator size="small" color="#0C553C" />
                    <Text style={styles.rescheduleLoadingText}>Cargando fechas...</Text>
                  </View>
                )}
              </View>

              {/* Selector de Hora - Solo aparece cuando hay fecha seleccionada */}
              {newDate && (
                <View style={styles.rescheduleSectionContainer}>
                  <View style={styles.rescheduleSectionHeader}>
                    <View style={[styles.rescheduleSectionNumber, newTime ? styles.rescheduleSectionNumberActive : null]}>
                      <Text style={[styles.rescheduleSectionNumberText, newTime ? styles.rescheduleSectionNumberTextActive : null]}>2</Text>
                    </View>
                    <Text style={styles.rescheduleSectionTitle}>Selecciona la hora</Text>
                  </View>

                  {/* Leyenda de disponibilidad */}
                  <View style={styles.rescheduleHorariosLeyenda}>
                    <View style={styles.rescheduleLeyendaItem}>
                      <View style={[styles.rescheduleLeyendaColor, { backgroundColor: '#E8F5E9' }]} />
                      <Text style={styles.rescheduleLeyendaText}>Disponible</Text>
                    </View>
                    <View style={styles.rescheduleLeyendaItem}>
                      <View style={[styles.rescheduleLeyendaColor, { backgroundColor: '#FFEBEE' }]} />
                      <Text style={styles.rescheduleLeyendaText}>Ocupado</Text>
                    </View>
                    {esHoy && (
                      <View style={styles.rescheduleLeyendaItem}>
                        <View style={[styles.rescheduleLeyendaColor, { backgroundColor: '#E0E0E0' }]} />
                        <Text style={styles.rescheduleLeyendaText}>Pasado</Text>
                      </View>
                    )}
                  </View>

                  {loadingHorarios ? (
                    <View style={styles.rescheduleLoadingContainer}>
                      <ActivityIndicator size="small" color="#0C553C" />
                      <Text style={styles.rescheduleLoadingText}>Cargando horarios...</Text>
                    </View>
                  ) : todosLosHorarios.length > 0 ? (
                    <>
                      <View style={styles.rescheduleTimeSlotsContainer}>
                        {todosLosHorarios.map((horario) => {
                          const isOcupado = horario.ocupado;
                          const isPasado = horario.pasado;
                          const isDisponible = horario.disponible;
                          const isSelected = newTime === horario.hora;
                          const isDisabled = isOcupado || isPasado;

                          return (
                            <TouchableOpacity
                              key={horario.hora}
                              style={[
                                styles.rescheduleTimeSlot,
                                isOcupado && styles.rescheduleTimeSlotOcupado,
                                isPasado && styles.rescheduleTimeSlotPasado,
                                isSelected && styles.rescheduleTimeSlotSelected
                              ]}
                              onPress={() => {
                                if (isDisponible) {
                                  setNewTime(horario.hora);
                                }
                              }}
                              disabled={isDisabled}
                            >
                              <Text style={[
                                styles.rescheduleTimeText,
                                isOcupado && styles.rescheduleTimeTextOcupado,
                                isPasado && styles.rescheduleTimeTextPasado,
                                isSelected && styles.rescheduleTimeTextSelected
                              ]}>
                                {horario.hora}
                              </Text>
                              {isDisponible && !isSelected && (
                                <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                              )}
                              {isOcupado && (
                                <Ionicons name="lock-closed" size={14} color="#EF5350" />
                              )}
                              {isPasado && (
                                <Ionicons name="time-outline" size={14} color="#9E9E9E" />
                              )}
                              {isSelected && (
                                <Ionicons name="checkmark-circle" size={14} color="#fff" />
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      {/* Resumen de disponibilidad */}
                      <View style={styles.rescheduleDisponibilidadResumen}>
                        <Text style={styles.rescheduleDisponibilidadTexto}>
                          <Ionicons name="stats-chart-outline" size={14} color="#1565C0" /> {horariosDisponibles.length} horarios disponibles
                        </Text>
                      </View>
                    </>
                  ) : (
                    <View style={styles.rescheduleNoHorarios}>
                      <Ionicons name="calendar-outline" size={40} color="#ccc" />
                      <Text style={styles.rescheduleNoHorariosText}>
                        No hay horarios disponibles para esta fecha
                      </Text>
                      <Text style={styles.rescheduleNoHorariosSubtext}>
                        Prueba seleccionando otro día
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Resumen de la nueva cita */}
              {newDate && newTime && (
                <View style={styles.rescheduleResumen}>
                  <Text style={styles.rescheduleResumenTitle}>
                    <Ionicons name="checkmark-circle" size={18} color="#4CAF50" /> Nueva cita seleccionada:
                  </Text>
                  <View style={styles.rescheduleResumenRow}>
                    <Ionicons name="calendar" size={16} color="#0C553C" />
                    <Text style={styles.rescheduleResumenText}>
                      {availableDates.find(d => d.id === newDate)?.display || newDate}
                    </Text>
                  </View>
                  <View style={styles.rescheduleResumenRow}>
                    <Ionicons name="time" size={16} color="#0C553C" />
                    <Text style={styles.rescheduleResumenText}>{newTime}</Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Botones de acción - Fijos en la parte inferior */}
            <View style={styles.rescheduleButtons}>
              <TouchableOpacity 
                style={styles.rescheduleCancelBtn}
                onPress={() => { 
                  console.log('Cancel button pressed');
                  setShowReschedule(false); 
                  setSelected(null); 
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.rescheduleCancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.rescheduleConfirmBtn,
                  (!newDate || !newTime) && styles.rescheduleConfirmBtnDisabled
                ]}
                onPress={() => {
                  console.log('Confirm button pressed', { newDate, newTime });
                  confirmReschedule();
                }}
                disabled={!newDate || !newTime}
                activeOpacity={0.7}
              >
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={styles.rescheduleConfirmBtnText}> Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal personalizado de tiempo */}
      <Modal visible={showTimeModal} animationType="fade" transparent>
        <View style={styles.timeModalOverlay}>
          <View style={styles.timeModalCard}>
            {/* Icono principal */}
            <View style={[
              styles.timeModalIconContainer,
              { backgroundColor: timeModalData.canProceed ? '#E8F5E9' : '#FFF3E0' }
            ]}>
              <Ionicons 
                name={timeModalData.canProceed ? 'time-outline' : 'alert-circle-outline'} 
                size={48} 
                color={timeModalData.canProceed ? '#2E7D32' : '#E65100'} 
              />
            </View>

            {/* Título */}
            <Text style={styles.timeModalTitle}>
              {timeModalType === 'cancel' && !timeModalData.canProceed 
                ? 'No es posible cancelar'
                : timeModalType === 'edit' && !timeModalData.canProceed
                ? 'No es posible reagendar'
                : 'Reagendar Cita'
              }
            </Text>

            {/* Contenido según el tipo */}
            {!timeModalData.canProceed ? (
              <>
                {/* Tiempo restante grande */}
                <View style={styles.timeModalTimeBox}>
                  <Text style={styles.timeModalTimeNumber}>{timeModalData.hoursRemaining}</Text>
                  <Text style={styles.timeModalTimeLabel}>horas restantes</Text>
                </View>

                <Text style={styles.timeModalDescription}>
                  {timeModalType === 'cancel' 
                    ? 'Solo puedes cancelar tu cita hasta 12 horas antes de la hora programada.'
                    : 'Solo puedes reagendar tu cita hasta 6 horas antes de la hora programada.'
                  }
                </Text>

                {/* Info de la cita */}
                {timeModalData.reserva && (
                  <View style={styles.timeModalInfoBox}>
                    <View style={styles.timeModalInfoRow}>
                      <Ionicons name="calendar-outline" size={18} color="#0C553C" />
                      <Text style={styles.timeModalInfoText}>
                        {new Date(timeModalData.reserva.fecha).toLocaleDateString('es-ES', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </Text>
                    </View>
                    <View style={styles.timeModalInfoRow}>
                      <Ionicons name="time-outline" size={18} color="#0C553C" />
                      <Text style={styles.timeModalInfoText}>
                        {timeModalData.reserva.hora.toString().substring(0, 5)}
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.timeModalSupportBox}>
                  <Ionicons name="chatbubble-ellipses-outline" size={20} color="#1976D2" />
                  <Text style={styles.timeModalSupportText}>
                    Si necesitas ayuda, contacta a soporte
                  </Text>
                </View>
              </>
            ) : (
              <>
                {/* Modal de confirmación para editar */}
                <View style={styles.timeModalTimeBox}>
                  <Text style={[styles.timeModalTimeNumber, { color: '#2E7D32' }]}>{timeModalData.hoursRemaining}</Text>
                  <Text style={styles.timeModalTimeLabel}>horas disponibles</Text>
                </View>

                <Text style={styles.timeModalDescription}>
                  Puedes modificar la fecha y hora de tu reserva.
                </Text>

                <View style={styles.timeModalInfoBox}>
                  <View style={styles.timeModalInfoRow}>
                    <Ionicons name="checkmark-circle" size={18} color="#2E7D32" />
                    <Text style={styles.timeModalInfoText}>
                      Los cambios deben realizarse al menos 6 horas antes
                    </Text>
                  </View>
                </View>
              </>
            )}

            {/* Botones */}
            <View style={styles.timeModalButtons}>
              {timeModalData.canProceed ? (
                <>
                  <TouchableOpacity 
                    style={[styles.timeModalBtn, styles.timeModalBtnSecondary]}
                    onPress={() => setShowTimeModal(false)}
                  >
                    <Text style={styles.timeModalBtnSecondaryText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.timeModalBtn, styles.timeModalBtnPrimary]}
                    onPress={proceedWithReschedule}
                  >
                    <Ionicons name="create-outline" size={18} color="#fff" />
                    <Text style={styles.timeModalBtnPrimaryText}> Continuar</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity 
                  style={[styles.timeModalBtn, styles.timeModalBtnPrimary, { flex: 1 }]}
                  onPress={() => setShowTimeModal(false)}
                >
                  <Text style={styles.timeModalBtnPrimaryText}>Entendido</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Confirmación de Cancelación */}
      <Modal visible={showCancelConfirm} animationType="fade" transparent>
        <View style={styles.cancelModalOverlay}>
          <View style={styles.cancelModalCard}>
            {/* Icono de advertencia */}
            <View style={styles.cancelModalIconContainer}>
              <View style={styles.cancelModalIconBg}>
                <Ionicons name="warning" size={40} color="#DC2626" />
              </View>
            </View>

            {/* Título */}
            <Text style={styles.cancelModalTitle}>¿Cancelar Reserva?</Text>
            <Text style={styles.cancelModalSubtitle}>Esta acción no se puede deshacer</Text>

            {/* Información de la reserva */}
            {cancelReserva && (
              <View style={styles.cancelModalInfo}>
                <View style={styles.cancelModalInfoRow}>
                  <Ionicons name="calendar-outline" size={18} color="#666" />
                  <Text style={styles.cancelModalInfoText}>
                    {new Date(cancelReserva.fecha.toString().split('T')[0] + 'T12:00:00').toLocaleDateString('es-ES', { 
                      weekday: 'long', 
                      day: 'numeric', 
                      month: 'long' 
                    })}
                  </Text>
                </View>
                <View style={styles.cancelModalInfoRow}>
                  <Ionicons name="time-outline" size={18} color="#666" />
                  <Text style={styles.cancelModalInfoText}>
                    {cancelReserva.hora.toString().substring(0, 5)}
                  </Text>
                </View>
                <View style={styles.cancelModalInfoRow}>
                  <Ionicons name="business-outline" size={18} color="#666" />
                  <Text style={styles.cancelModalInfoText}>
                    {cancelReserva.nombre_empresa}
                  </Text>
                </View>
                <View style={styles.cancelModalInfoRow}>
                  <Ionicons name="cut-outline" size={18} color="#666" />
                  <Text style={styles.cancelModalInfoText}>
                    {cancelReserva.servicios?.map(s => s.nombre_servicio).join(', ')}
                  </Text>
                </View>
              </View>
            )}

            {/* Botones */}
            <View style={styles.cancelModalButtons}>
              <TouchableOpacity 
                style={styles.cancelModalBtnKeep}
                onPress={() => setShowCancelConfirm(false)}
                disabled={cancelLoading}
              >
                <Text style={styles.cancelModalBtnKeepText}>No, mantener</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.cancelModalBtnConfirm}
                onPress={confirmCancelReservation}
                disabled={cancelLoading}
              >
                {cancelLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={18} color="#fff" />
                    <Text style={styles.cancelModalBtnConfirmText}>Sí, cancelar</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Resultado (Éxito/Error) */}
      <Modal visible={showResultModal} animationType="fade" transparent>
        <View style={styles.resultModalOverlay}>
          <View style={styles.resultModalCard}>
            {/* Icono */}
            <View style={[
              styles.resultModalIconContainer,
              resultModalType === 'success' ? styles.resultModalIconSuccess : styles.resultModalIconError
            ]}>
              <Ionicons 
                name={resultModalType === 'success' ? 'checkmark-circle' : 'close-circle'} 
                size={60} 
                color={resultModalType === 'success' ? '#059669' : '#DC2626'} 
              />
            </View>

            {/* Título */}
            <Text style={[
              styles.resultModalTitle,
              resultModalType === 'success' ? styles.resultModalTitleSuccess : styles.resultModalTitleError
            ]}>
              {resultModalType === 'success' ? '¡Cancelación Exitosa!' : 'Error'}
            </Text>

            {/* Mensaje */}
            <Text style={styles.resultModalMessage}>{resultModalMessage}</Text>

            {/* Decoración de checkmarks para éxito */}
            {resultModalType === 'success' && (
              <View style={styles.resultModalDecoration}>
                <Ionicons name="sparkles" size={20} color="#10B981" style={{ marginHorizontal: 8 }} />
                <Ionicons name="sparkles" size={16} color="#34D399" style={{ marginHorizontal: 8 }} />
                <Ionicons name="sparkles" size={20} color="#10B981" style={{ marginHorizontal: 8 }} />
              </View>
            )}

            {/* Botón */}
            <TouchableOpacity 
              style={[
                styles.resultModalBtn,
                resultModalType === 'success' ? styles.resultModalBtnSuccess : styles.resultModalBtnError
              ]}
              onPress={handleResultModalClose}
            >
              <Text style={styles.resultModalBtnText}>
                {resultModalType === 'success' ? 'Entendido' : 'Cerrar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* QR Scanner Modal */}
      <Modal visible={showQRScanner} animationType="slide">
        <View style={styles.scannerContainer}>
          <View style={styles.scannerHeader}>
            <TouchableOpacity 
              style={styles.scannerCloseBtn} 
              onPress={() => {
                setShowQRScanner(false);
                setScannedData(null);
                setVerifying(false);
              }}
            >
              <View style={styles.scannerCloseBtnContent}>
                <Ionicons name="close" size={18} color="#fff" />
                <Text style={styles.scannerCloseBtnText}> Cerrar</Text>
              </View>
            </TouchableOpacity>
            <Text style={styles.scannerTitle}>Escanear QR</Text>
            <View style={{ width: 80 }} />
          </View>
          
          <View style={styles.scannerContent}>
            <View style={styles.scannerInstructions}>
              <View style={styles.scannerInstructionsRow}>
                <Ionicons name="phone-portrait-outline" size={20} color="#333" />
                <Text style={styles.scannerInstructionsText}>
                  Escanea el código QR que te muestra la empresa para confirmar que el servicio fue completado
                </Text>
              </View>
            </View>
            
            <View style={styles.cameraContainer}>
              <CameraView
                style={styles.camera}
                facing="back"
                barcodeScannerSettings={{
                  barcodeTypes: ['qr'],
                }}
                onBarcodeScanned={scannedData ? undefined : handleBarCodeScanned}
              />
              <View style={styles.scannerOverlay}>
                <View style={styles.scannerFrame} />
              </View>
            </View>
            
            {verifying && (
              <View style={styles.verifyingContainer}>
                <ActivityIndicator size="large" color="#0C553C" />
                <Text style={styles.verifyingText}>Verificando reserva...</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  
  // ============================================
  // HEADER MEJORADO
  // ============================================
  header: { 
    backgroundColor: '#0C553C', 
    paddingTop: 50, 
    paddingBottom: 20, 
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#0C553C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: { 
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: { 
    color: '#fff', 
    fontSize: 20, 
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 2,
  },
  headerRight: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRefreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  content: { flex: 1, padding: 16 },
  
  // ===== ESTILOS TABS MEJORADAS =====
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 6,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  tabActive: {
    backgroundColor: '#0C553C',
  },
  tabIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconContainerActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  tabTextActive: {
    color: '#fff',
  },
  tabBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  tabBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0C553C',
  },
  tabBadgeTextActive: {
    color: '#fff',
  },
  
  // ===== ESTILOS CARDS MEJORADAS =====
  appointmentCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: 4,
  },
  cardDateSection: {
    width: 72,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#0C553C',
  },
  cardDateDay: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  cardDateMonth: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0C553C',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  cardDateWeekday: {
    fontSize: 12,
    fontWeight: '500',
    color: '#888',
    marginTop: 4,
  },
  cardMainContent: {
    flex: 1,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardServiceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  cardServiceIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardServiceName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
  },
  cardStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  cardStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 16,
  },
  cardDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardDetailText: {
    fontSize: 13,
    color: '#666',
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 8,
  },
  cardActionBtnQR: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  cardActionBtnQRText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  cardActionBtnEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  cardActionBtnEditText: {
    color: '#0C553C',
    fontSize: 12,
    fontWeight: '700',
  },
  cardActionBtnCancel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  cardActionBtnCancelText: {
    color: '#E53935',
    fontSize: 12,
    fontWeight: '700',
  },
  
  // ===== ESTILOS MODAL DETALLES MEJORADO =====
  detailModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  detailModalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  detailModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  detailModalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailModalStatusIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailModalHeaderText: {
    marginLeft: 14,
    flex: 1,
  },
  detailModalStatusLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  detailModalStatusValue: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },
  detailModalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailModalContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  detailReservaNumber: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailReservaNumberLabel: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  detailReservaNumberValue: {
    fontSize: 18,
    color: '#0C553C',
    fontWeight: '800',
    marginTop: 4,
  },
  detailDateTimeCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  detailDateSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailDateInfo: {
    marginLeft: 12,
    flex: 1,
  },
  detailDateLabel: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  detailDateValue: {
    fontSize: 15,
    color: '#1a1a1a',
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  detailDateDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },
  detailTimeSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailTimeInfo: {
    marginLeft: 12,
    flex: 1,
  },
  detailTimeLabel: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  detailTimeValue: {
    fontSize: 24,
    color: '#0C553C',
    fontWeight: '800',
    marginTop: 2,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  detailSectionTitle: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '700',
  },
  detailSectionContent: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 14,
  },
  detailEmpresaName: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '700',
    marginBottom: 8,
  },
  detailInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailInfoText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  detailServiciosList: {
    gap: 10,
  },
  detailServicioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 14,
  },
  detailServicioIcon: {
    marginRight: 12,
  },
  detailServicioInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailServicioName: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '600',
    flex: 1,
  },
  detailServicioPrice: {
    fontSize: 14,
    color: '#0C553C',
    fontWeight: '700',
  },
  detailTotalCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    padding: 18,
    marginTop: 8,
    borderWidth: 2,
    borderColor: '#0C553C',
  },
  detailTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailTotalLabel: {
    fontSize: 16,
    color: '#0C553C',
    fontWeight: '600',
  },
  detailTotalValue: {
    fontSize: 24,
    color: '#0C553C',
    fontWeight: '800',
  },
  detailModalButtons: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 24,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  detailBtnEdit: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
  },
  detailBtnEditText: {
    fontSize: 15,
    color: '#0C553C',
    fontWeight: '700',
  },
  detailBtnCancel: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFEBEE',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
  },
  detailBtnCancelText: {
    fontSize: 15,
    color: '#E53935',
    fontWeight: '700',
  },
  detailBtnClose: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 14,
    borderRadius: 12,
  },
  detailBtnCloseText: {
    fontSize: 15,
    color: '#666',
    fontWeight: '700',
  },
  
  // Estilos antiguos (mantener compatibilidad)
  filterContainer: { flexDirection: 'row', marginBottom: 16, backgroundColor: '#fff', borderRadius: 8, padding: 4 },
  filterBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  filterActive: { backgroundColor: '#0C553C' },
  filterText: { fontSize: 14, color: '#666' },
  filterTextActive: { color: '#fff', fontWeight: '600' },
  sectionHeader: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#888', 
    marginBottom: 12, 
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3.84, elevation: 3 },
  cardIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  iconText: { fontSize: 24 },
  cardContent: { flex: 1 },
  service: { fontSize: 16, fontWeight: '700', color: '#0C553C' },
  meta: { fontSize: 13, color: '#666', marginTop: 4 },
  location: { fontSize: 12, color: '#999', marginTop: 2 },
  status: { marginTop: 8, fontSize: 11, fontWeight: '700', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  pending: { backgroundColor: '#fff3cd', color: '#856404' },
  done: { backgroundColor: '#d4edda', color: '#155724' },
  cancelled: { backgroundColor: '#f8d7da', color: '#721c24' },
  cardActions: { alignItems: 'flex-end' },
  actionBtn: { backgroundColor: '#0C553C', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginTop: 8 },
  actionText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  cancelBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e74c3c' },
  cancelBtnText: { color: '#e74c3c', fontWeight: '700', fontSize: 12 },
  modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { width: '90%', backgroundColor: '#fff', borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0C553C', marginBottom: 16 },
  modalService: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 8 },
  modalMeta: { color: '#666', marginBottom: 4 },
  modalPrice: { fontSize: 18, fontWeight: 'bold', color: '#0C553C' },
  modalBtn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  modalBtnText: { color: '#0C553C', fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginTop: 8, fontSize: 16 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginTop: 12 },
  infoBox: { backgroundColor: '#E8F5E9', borderRadius: 8, padding: 12, marginBottom: 15, borderLeftWidth: 4, borderLeftColor: '#0C553C' },
  infoText: { fontSize: 13, color: '#2E7D32', marginBottom: 4 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 16, color: '#666', marginBottom: 20 },
  bookButton: { backgroundColor: '#0C553C', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 25 },
  bookButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  // Estilos para botón de escanear QR
  qrScanBtn: { 
    backgroundColor: '#2196F3', 
    paddingVertical: 8, 
    paddingHorizontal: 12, 
    borderRadius: 8, 
    marginBottom: 4 
  },
  qrScanBtnText: { 
    color: '#fff', 
    fontWeight: '700', 
    fontSize: 12 
  },
  qrScanBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Estilos para modal
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  // Estilos para el escáner QR
  scannerContainer: { 
    flex: 1, 
    backgroundColor: '#000' 
  },
  scannerHeader: { 
    backgroundColor: '#0C553C', 
    paddingTop: 50, 
    paddingBottom: 18, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16 
  },
  scannerCloseBtn: { 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 8 
  },
  scannerCloseBtnText: { 
    color: '#fff', 
    fontWeight: '700', 
    fontSize: 14 
  },
  scannerCloseBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scannerTitle: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: 'bold' 
  },
  scannerContent: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  scannerInstructions: { 
    backgroundColor: 'rgba(255,255,255,0.95)', 
    padding: 16, 
    marginHorizontal: 20, 
    marginBottom: 20, 
    borderRadius: 12 
  },
  scannerInstructionsText: { 
    fontSize: 14, 
    color: '#333', 
    textAlign: 'center', 
    lineHeight: 22,
    flex: 1,
    marginLeft: 8,
  },
  scannerInstructionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cameraContainer: { 
    width: 280, 
    height: 280, 
    borderRadius: 20, 
    overflow: 'hidden', 
    position: 'relative' 
  },
  camera: { 
    flex: 1 
  },
  scannerOverlay: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  scannerFrame: { 
    width: 200, 
    height: 200, 
    borderWidth: 3, 
    borderColor: '#0C553C', 
    borderRadius: 12, 
    backgroundColor: 'transparent' 
  },
  verifyingContainer: { 
    position: 'absolute', 
    bottom: 100, 
    backgroundColor: 'rgba(255,255,255,0.95)', 
    padding: 20, 
    borderRadius: 12, 
    alignItems: 'center' 
  },
  verifyingText: { 
    marginTop: 10, 
    fontSize: 16, 
    color: '#0C553C', 
    fontWeight: '600' 
  },
  // Estilos para modal de tiempo personalizado
  timeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  timeModalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  timeModalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  timeModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 16,
  },
  timeModalTimeBox: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  timeModalTimeNumber: {
    fontSize: 48,
    fontWeight: '800',
    color: '#E65100',
  },
  timeModalTimeLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    marginTop: 4,
  },
  timeModalDescription: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  timeModalInfoBox: {
    width: '100%',
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  timeModalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeModalInfoText: {
    fontSize: 14,
    color: '#2E7D32',
    marginLeft: 10,
    flex: 1,
  },
  timeModalSupportBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  timeModalSupportText: {
    fontSize: 13,
    color: '#1976D2',
    marginLeft: 10,
    flex: 1,
  },
  timeModalButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  timeModalBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  timeModalBtnPrimary: {
    backgroundColor: '#0C553C',
  },
  timeModalBtnPrimaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  timeModalBtnSecondary: {
    backgroundColor: '#f1f3f4',
  },
  timeModalBtnSecondaryText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  // Estilos para modal de reagendar mejorado
  rescheduleModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  rescheduleModalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
    paddingBottom: 0,
    overflow: 'hidden',
  },
  rescheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  rescheduleHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0C553C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rescheduleTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a1a',
    flex: 1,
    marginLeft: 12,
  },
  rescheduleCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rescheduleCurrentInfo: {
    backgroundColor: '#E3F2FD',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#1976D2',
  },
  rescheduleCurrentTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  rescheduleCurrentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rescheduleCurrentText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  rescheduleContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  rescheduleSectionContainer: {
    marginTop: 20,
  },
  rescheduleSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  rescheduleSectionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  rescheduleSectionNumberActive: {
    backgroundColor: '#4CAF50',
  },
  rescheduleSectionNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#999',
  },
  rescheduleSectionNumberTextActive: {
    color: '#fff',
  },
  rescheduleSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  rescheduleDatesContainer: {
    paddingRight: 16,
    gap: 10,
  },
  rescheduleDateCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    width: 72,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  rescheduleDateCardSelected: {
    backgroundColor: '#0C553C',
    borderColor: '#0C553C',
  },
  rescheduleDateCardToday: {
    borderColor: '#4CAF50',
  },
  rescheduleDateBadge: {
    position: 'absolute',
    top: -8,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  rescheduleDateBadgeSelected: {
    backgroundColor: '#fff',
  },
  rescheduleDateBadgeText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: '700',
  },
  rescheduleDateBadgeTextSelected: {
    color: '#0C553C',
  },
  rescheduleDateDayName: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    marginTop: 4,
  },
  rescheduleDateDayNum: {
    fontSize: 22,
    color: '#333',
    fontWeight: '700',
    marginVertical: 2,
  },
  rescheduleDateMonth: {
    fontSize: 11,
    color: '#888',
    fontWeight: '500',
  },
  rescheduleDateTextSelected: {
    color: '#fff',
  },
  rescheduleHorariosLeyenda: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingVertical: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  rescheduleLeyendaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rescheduleLeyendaColor: {
    width: 14,
    height: 14,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  rescheduleLeyendaText: {
    fontSize: 10,
    color: '#666',
  },
  rescheduleLoadingContainer: {
    padding: 30,
    alignItems: 'center',
  },
  rescheduleLoadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  rescheduleTimeSlotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  rescheduleTimeSlot: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minWidth: '22%',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  rescheduleTimeSlotOcupado: {
    backgroundColor: '#FFEBEE',
    opacity: 0.7,
  },
  rescheduleTimeSlotPasado: {
    backgroundColor: '#F5F5F5',
    opacity: 0.5,
  },
  rescheduleTimeSlotSelected: {
    backgroundColor: '#0C553C',
    borderColor: '#0C553C',
  },
  rescheduleTimeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
  },
  rescheduleTimeTextOcupado: {
    color: '#C62828',
    textDecorationLine: 'line-through',
  },
  rescheduleTimeTextPasado: {
    color: '#9E9E9E',
    textDecorationLine: 'line-through',
  },
  rescheduleTimeTextSelected: {
    color: '#fff',
  },
  rescheduleDisponibilidadResumen: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    alignItems: 'center',
  },
  rescheduleDisponibilidadTexto: {
    fontSize: 13,
    color: '#1565C0',
    fontWeight: '600',
  },
  rescheduleNoHorarios: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  rescheduleNoHorariosText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
  },
  rescheduleNoHorariosSubtext: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },
  rescheduleResumen: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  rescheduleResumenTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2E7D32',
    marginBottom: 12,
  },
  rescheduleResumenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  rescheduleResumenText: {
    fontSize: 15,
    color: '#333',
    marginLeft: 10,
    fontWeight: '600',
  },
  rescheduleButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  rescheduleCancelBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  rescheduleCancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  rescheduleConfirmBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#0C553C',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  rescheduleConfirmBtnDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.7,
  },
  rescheduleConfirmBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },

  // ============================================
  // ESTILOS MODAL CONFIRMACIÓN DE CANCELACIÓN
  // ============================================
  cancelModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cancelModalCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
  },
  cancelModalIconContainer: {
    marginBottom: 16,
  },
  cancelModalIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
  },
  cancelModalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  cancelModalInfo: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelModalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cancelModalInfoText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 12,
    flex: 1,
  },
  cancelModalButtons: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
  },
  cancelModalBtnKeep: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelModalBtnKeepText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  cancelModalBtnConfirm: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  cancelModalBtnConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },

  // ============================================
  // ESTILOS MODAL RESULTADO (ÉXITO/ERROR)
  // ============================================
  resultModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  resultModalCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
  },
  resultModalIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  resultModalIconSuccess: {
    backgroundColor: '#D1FAE5',
  },
  resultModalIconError: {
    backgroundColor: '#FEE2E2',
  },
  resultModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  resultModalTitleSuccess: {
    color: '#059669',
  },
  resultModalTitleError: {
    color: '#DC2626',
  },
  resultModalMessage: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  resultModalDecoration: {
    flexDirection: 'row',
    marginBottom: 20,
    justifyContent: 'center',
  },
  resultModalBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultModalBtnSuccess: {
    backgroundColor: '#059669',
  },
  resultModalBtnError: {
    backgroundColor: '#DC2626',
  },
  resultModalBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

