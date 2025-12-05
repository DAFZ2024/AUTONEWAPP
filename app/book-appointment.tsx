import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator, TextInput, Platform, Linking, Modal, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import Constants from 'expo-constants';

// URL del backend en producción
const PRODUCTION_API_URL = 'https://autonewapp-backend.onrender.com/api';
const API_URL = Constants.expoConfig?.extra?.apiUrl || PRODUCTION_API_URL;

export default function BookAppointment() {
  const router = useRouter();
  
  // Estados del formulario
  const [selectedService, setSelectedService] = useState<number[]>([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [placaVehiculo, setPlacaVehiculo] = useState('');
  const [tipoVehiculo, setTipoVehiculo] = useState('');
  const [conductorAsignado, setConductorAsignado] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [esPagoIndividual, setEsPagoIndividual] = useState(true);
  const [esReservaEmpresarial, setEsReservaEmpresarial] = useState(false);
  
  // Estados de datos
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [servicios, setServicios] = useState<any[]>([]);
  const [horariosDisponibles, setHorariosDisponibles] = useState<string[]>([]);
  const [horasOcupadas, setHorasOcupadas] = useState<string[]>([]);
  const [todosLosHorarios, setTodosLosHorarios] = useState<{hora: string, disponible: boolean, ocupado: boolean, pasado: boolean}[]>([]);
  const [esHoy, setEsHoy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingEmpresas, setLoadingEmpresas] = useState(false);
  const [loadingHorarios, setLoadingHorarios] = useState(false);
  const [userData, setUserData] = useState<any>(null);

  // Estados de filtros
  const [filtroTipoVehiculo, setFiltroTipoVehiculo] = useState<string>('');
  const [filtroTipoServicio, setFiltroTipoServicio] = useState<string>('');

  // Estados de suscripción
  const [suscripcion, setSuscripcion] = useState<any>(null);
  const [serviciosPlan, setServiciosPlan] = useState<number[]>([]);
  const [serviciosDisponibles, setServiciosDisponibles] = useState<number>(0);
  const [tieneSuscripcion, setTieneSuscripcion] = useState(false);
  const [loadingSuscripcion, setLoadingSuscripcion] = useState(false);

  // Estados de ubicación GPS
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [ordenarPorDistancia, setOrdenarPorDistancia] = useState(false);

  // Paso actual del flujo (1: Servicios, 2: Empresas, 3: Fecha, 4: Hora)
  const [currentStep, setCurrentStep] = useState(1);

  // Estados para modales personalizados
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalData, setConfirmModalData] = useState<any>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalData, setSuccessModalData] = useState<{title: string, message: string, isSuccess: boolean}>({title: '', message: '', isSuccess: true});

  useEffect(() => {
    cargarServicios();
    cargarDatosUsuario();
    cargarSuscripcionUsuario();
  }, []);

  // Cargar empresas cuando se seleccionan servicios
  useEffect(() => {
    if (selectedService.length > 0) {
      cargarEmpresasPorServicios();
    } else {
      setEmpresas([]);
      setSelectedEmpresa(null);
    }
  }, [selectedService]);

  // Cargar horarios cuando se selecciona empresa y fecha
  useEffect(() => {
    if (selectedEmpresa && selectedDate) {
      cargarHorariosDisponibles();
    }
  }, [selectedEmpresa, selectedDate]);

  const cargarDatosUsuario = async () => {
    try {
      // Obtener con la misma clave que se guarda en login.tsx ('user')
      const userDataString = await AsyncStorage.getItem('user');
      const token = await AsyncStorage.getItem('token');
      
      console.log('Usuario cargado:', userDataString ? 'Sí' : 'No');
      console.log('Token existe:', token ? 'Sí' : 'No');
      
      if (userDataString) {
        const user = JSON.parse(userDataString);
        console.log('Datos del usuario:', user);
        setUserData(user);
      } else if (!token) {
        // Solo redirigir si no hay ni usuario ni token
        Alert.alert('Error', 'No se encontraron datos de usuario. Por favor, inicia sesión nuevamente.');
        router.push('./login');
      }
    } catch (error) {
      console.error('Error al cargar datos del usuario:', error);
    }
  };

  const cargarSuscripcionUsuario = async () => {
    try {
      setLoadingSuscripcion(true);
      const token = await AsyncStorage.getItem('token');
      
      if (!token) return;

      const response = await fetch(`${API_URL}/reservas/verificar-suscripcion`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setTieneSuscripcion(data.tieneSuscripcion);
        if (data.tieneSuscripcion) {
          setSuscripcion(data.suscripcion);
          // Extraer IDs de servicios del plan
          const idsServiciosPlan = data.serviciosPlan.map((s: any) => s.id_servicio);
          setServiciosPlan(idsServiciosPlan);
          setServiciosDisponibles(data.serviciosDisponibles);
        }
      }
    } catch (error) {
      console.error('Error al cargar suscripción:', error);
    } finally {
      setLoadingSuscripcion(false);
    }
  };

  // Verificar si un servicio está en el plan del usuario
  const esServicioDelPlan = (servicioId: number) => {
    return serviciosPlan.includes(servicioId);
  };

  // Obtener ubicación del usuario
  const obtenerUbicacion = async () => {
    try {
      setLoadingLocation(true);
      setLocationError(null);
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setLocationError('Permiso de ubicación denegado');
        Alert.alert(
          'Permiso requerido',
          'Necesitamos acceso a tu ubicación para mostrar las empresas más cercanas.',
          [{ text: 'OK' }]
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
      setOrdenarPorDistancia(true);
      
    } catch (error) {
      console.error('Error al obtener ubicación:', error);
      setLocationError('No se pudo obtener la ubicación');
      Alert.alert('Error', 'No se pudo obtener tu ubicación. Verifica que el GPS esté activado.');
    } finally {
      setLoadingLocation(false);
    }
  };

  // Calcular distancia entre dos puntos (fórmula Haversine)
  const calcularDistancia = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Formatear distancia para mostrar
  const formatearDistancia = (distancia: number): string => {
    if (distancia < 1) {
      return `${Math.round(distancia * 1000)} m`;
    }
    return `${distancia.toFixed(1)} km`;
  };

  // Obtener empresas con distancia calculada y ordenadas
  const empresasConDistancia = empresas.map(empresa => {
    let distancia = null;
    if (userLocation && empresa.latitud && empresa.longitud) {
      distancia = calcularDistancia(
        userLocation.latitude,
        userLocation.longitude,
        parseFloat(empresa.latitud),
        parseFloat(empresa.longitud)
      );
    }
    return { ...empresa, distancia };
  }).sort((a, b) => {
    if (ordenarPorDistancia && a.distancia !== null && b.distancia !== null) {
      return a.distancia - b.distancia;
    }
    return 0;
  });

  // Abrir mapa con dirección de la empresa
  const abrirMapa = (empresa: any) => {
    const lat = empresa.latitud;
    const lng = empresa.longitud;
    const label = encodeURIComponent(empresa.nombre_empresa);
    
    let url = '';
    if (Platform.OS === 'ios') {
      url = `maps:0,0?q=${label}@${lat},${lng}`;
    } else {
      url = `geo:${lat},${lng}?q=${lat},${lng}(${label})`;
    }
    
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        // Fallback a Google Maps web
        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
      }
    });
  };

  // Llamar a la empresa
  const llamarEmpresa = (telefono: string) => {
    Linking.openURL(`tel:${telefono}`);
  };

  const cargarServicios = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/reservas/servicios`);
      const data = await response.json();
      if (data.success) {
        setServicios(data.servicios);
      }
    } catch (error) {
      console.error('Error al cargar servicios:', error);
      Alert.alert('Error', 'No se pudieron cargar los servicios');
    } finally {
      setLoading(false);
    }
  };

  const cargarEmpresasPorServicios = async () => {
    try {
      setLoadingEmpresas(true);
      const serviciosIds = selectedService.join(',');
      const response = await fetch(
        `${API_URL}/reservas/empresas-por-servicios?servicios=${serviciosIds}`
      );
      const data = await response.json();
      
      if (data.success) {
        setEmpresas(data.empresas);
        if (data.empresas.length === 0) {
          Alert.alert(
            'Sin resultados', 
            'No hay empresas que ofrezcan todos los servicios seleccionados. Intenta con menos servicios.'
          );
        }
      }
    } catch (error) {
      console.error('Error al cargar empresas:', error);
      Alert.alert('Error', 'No se pudieron cargar las empresas');
    } finally {
      setLoadingEmpresas(false);
    }
  };

  const cargarHorariosDisponibles = async () => {
    try {
      setLoadingHorarios(true);
      const response = await fetch(
        `${API_URL}/reservas/horarios-disponibles?empresaId=${selectedEmpresa}&fecha=${selectedDate}`
      );
      const data = await response.json();
      if (data.success) {
        setHorariosDisponibles(data.horariosDisponibles);
        setHorasOcupadas(data.horasOcupadas || []);
        setTodosLosHorarios(data.todosLosHorarios || []);
        setEsHoy(data.esHoy || false);
      }
    } catch (error) {
      console.error('Error al cargar horarios:', error);
    } finally {
      setLoadingHorarios(false);
    }
  };

  const toggleServicio = (servicioId: number) => {
    if (selectedService.includes(servicioId)) {
      setSelectedService(selectedService.filter(id => id !== servicioId));
    } else {
      setSelectedService([...selectedService, servicioId]);
    }
    // Reset empresa cuando cambian servicios
    setSelectedEmpresa(null);
    setSelectedDate('');
    setSelectedTime('');
  };

  const calcularTotal = () => {
    return servicios
      .filter(s => selectedService.includes(s.id_servicio))
      .reduce((sum, s) => sum + parseFloat(s.precio), 0);
  };

  // Obtener tipos de servicio únicos
  const tiposServicioUnicos = [...new Set(servicios.map(s => s.tipo_servicio || s.categoria || 'General'))];
  
  // Categorías de servicios para filtro
  const categoriasServicio = ['Lavado', 'Encerado', 'Polichado', 'Aspirado', 'Detallado', 'Mecánica', 'Mantenimiento', 'Pintura'];

  // Tipos de vehículo para filtro
  const tiposVehiculoFiltro = ['Sedan', 'SUV', 'Camioneta', 'Hatchback', 'Van', 'Camión', 'Moto'];

  // Filtrar servicios según los filtros aplicados
  const serviciosFiltrados = servicios.filter(servicio => {
    // Filtro por categoría de servicio (busca en nombre o descripción)
    const cumpleCategoria = !filtroTipoServicio || 
      servicio.nombre_servicio?.toLowerCase().includes(filtroTipoServicio.toLowerCase()) ||
      servicio.descripcion?.toLowerCase().includes(filtroTipoServicio.toLowerCase()) ||
      servicio.tipo_servicio === filtroTipoServicio ||
      servicio.categoria === filtroTipoServicio;
    
    // Filtro por tipo de vehículo
    const cumpleTipoVehiculo = !filtroTipoVehiculo || 
      servicio.tipo_vehiculo_aplicable === filtroTipoVehiculo ||
      servicio.tipo_vehiculo_aplicable === 'Todos' ||
      !servicio.tipo_vehiculo_aplicable;
    
    return cumpleCategoria && cumpleTipoVehiculo;
  });

  // Limpiar filtros
  const limpiarFiltros = () => {
    setFiltroTipoVehiculo('');
    setFiltroTipoServicio('');
    setSelectedService([]);
  };

  const handleBookAppointment = async () => {
    if (!selectedEmpresa || selectedService.length === 0 || !selectedDate || !selectedTime) {
      setSuccessModalData({
        title: 'Campos incompletos',
        message: 'Por favor completa todos los campos requeridos para continuar.',
        isSuccess: false
      });
      setShowSuccessModal(true);
      return;
    }

    // Verificar que el usuario esté logueado (puede tener 'id' o 'id_usuario')
    if (!userData || (!userData.id && !userData.id_usuario)) {
      setSuccessModalData({
        title: 'Sesión requerida',
        message: 'Debes iniciar sesión para hacer una reserva.',
        isSuccess: false
      });
      setShowSuccessModal(true);
      setTimeout(() => router.push('./login'), 2000);
      return;
    }

    const serviciosSeleccionados = servicios.filter(s => 
      selectedService.includes(s.id_servicio)
    );
    
    const empresaSeleccionada = empresas.find(e => e.id_empresa === selectedEmpresa);
    const total = calcularTotal();

    // Formatear fecha para mostrar
    const fechaFormateada = formatearFechaModal(selectedDate);

    // Mostrar modal de confirmación personalizado
    setConfirmModalData({
      empresa: empresaSeleccionada?.nombre_empresa,
      servicios: serviciosSeleccionados,
      fecha: fechaFormateada,
      hora: selectedTime,
      placa: placaVehiculo || 'No especificado',
      tipoVehiculo: tipoVehiculo || 'No especificado',
      conductor: conductorAsignado || userData.nombre_completo,
      total: total
    });
    setShowConfirmModal(true);
  };

  // Formatear fecha para el modal
  const formatearFechaModal = (fechaStr: string) => {
    const fecha = new Date(fechaStr + 'T12:00:00');
    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${diasSemana[fecha.getDay()]}, ${fecha.getDate()} de ${meses[fecha.getMonth()]}`;
  };

  // Procesar la reserva después de confirmar en el modal
  const procesarReserva = () => {
    setShowConfirmModal(false);
    crearReserva();
  };

  const crearReserva = async () => {
    try {
      setLoading(true);
      // Obtener el token con la misma clave que se guarda en login.tsx
      const token = await AsyncStorage.getItem('token');
      
      console.log('Token obtenido:', token ? 'Existe' : 'No existe');
      
      if (!token) {
        setSuccessModalData({
          title: 'Error de autenticación',
          message: 'No se encontró token de autenticación. Por favor, inicia sesión nuevamente.',
          isSuccess: false
        });
        setShowSuccessModal(true);
        setTimeout(() => router.push('./login'), 2000);
        return;
      }

      console.log('Enviando reserva con datos:', {
        fecha: selectedDate,
        hora: selectedTime + ':00',
        empresa_id: selectedEmpresa,
        servicios: selectedService
      });

      const response = await fetch(`${API_URL}/reservas/crear`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fecha: selectedDate,
          hora: selectedTime + ':00',
          empresa_id: selectedEmpresa,
          // NO enviar usuario_id - se obtendrá del token JWT en el backend
          servicios: selectedService,
          placa_vehiculo: placaVehiculo || null,
          tipo_vehiculo: tipoVehiculo || null,
          conductor_asignado: conductorAsignado || (userData?.nombre_completo || ''),
          observaciones_empresariales: observaciones || '',
          es_pago_individual: esPagoIndividual,
          es_reserva_empresarial: esReservaEmpresarial,
          suscripcion_utilizada_id: null,
          suscripcion_empresarial_id: null
        })
      });

      console.log('Response status:', response.status);
      
      const data = await response.json();
      console.log('Response data:', data);

      // Verificar si el error es de autenticación
      if (response.status === 401 || response.status === 403) {
        setSuccessModalData({
          title: 'Sesión expirada',
          message: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
          isSuccess: false
        });
        setShowSuccessModal(true);
        setTimeout(() => router.push('./login'), 2000);
        return;
      }

      if (data.success) {
        setSuccessModalData({
          title: '¡Reserva Confirmada!',
          message: 'Tu reserva ha sido creada exitosamente. Te esperamos en la fecha y hora seleccionada.',
          isSuccess: true
        });
        setShowSuccessModal(true);
      } else {
        setSuccessModalData({
          title: 'Error',
          message: data.message || 'No se pudo crear la reserva. Intenta nuevamente.',
          isSuccess: false
        });
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('Error al crear reserva:', error);
      setSuccessModalData({
        title: 'Error de conexión',
        message: 'Ocurrió un error al crear la reserva. Verifica tu conexión a internet.',
        isSuccess: false
      });
      setShowSuccessModal(true);
    } finally {
      setLoading(false);
    }
  };

  // Generar fechas desde hoy hasta los próximos 10 días
  const generarFechas = () => {
    const fechas = [];
    const hoy = new Date();
    const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    for (let i = 0; i <= 10; i++) {
      const fecha = new Date(hoy);
      fecha.setDate(hoy.getDate() + i);
      
      const dia = diasSemana[fecha.getDay()];
      const mes = meses[fecha.getMonth()];
      const numDia = fecha.getDate();
      
      const fechaISO = fecha.toISOString().split('T')[0];
      const displayText = i === 0 ? `Hoy - ${numDia} ${mes}` : 
                         i === 1 ? `Mañana - ${numDia} ${mes}` :
                         `${dia} - ${numDia} ${mes}`;
      
      fechas.push({ id: fechaISO, display: displayText });
    }
    return fechas;
  };

  const dates = generarFechas();

  if (loading && servicios.length === 0) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#0C553C" />
        <Text style={{ marginTop: 10, color: '#666' }}>Cargando servicios...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <View style={styles.backButtonIcon}>
              <Ionicons name="chevron-back" size={20} color="#fff" />
            </View>
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={styles.title}>Reservar Cita</Text>
            <Text style={styles.subtitle}>Paso a paso</Text>
          </View>
          
          <View style={styles.headerSteps}>
            <View style={[styles.headerStepDot, selectedService.length > 0 && styles.headerStepDotActive]} />
            <View style={[styles.headerStepDot, selectedEmpresa !== null && styles.headerStepDotActive]} />
            <View style={[styles.headerStepDot, selectedDate && styles.headerStepDotActive]} />
            <View style={[styles.headerStepDot, selectedTime && styles.headerStepDotActive]} />
          </View>
        </View>
        
        {/* Resumen de selección en header */}
        {(selectedService.length > 0 || selectedEmpresa || selectedDate) && (
          <View style={styles.headerSummary}>
            {selectedService.length > 0 && (
              <View style={styles.headerSummaryItem}>
                <Ionicons name="cut" size={14} color="rgba(255,255,255,0.9)" />
                <Text style={styles.headerSummaryText}>{selectedService.length} servicio(s)</Text>
              </View>
            )}
            {selectedEmpresa && (
              <View style={styles.headerSummaryItem}>
                <Ionicons name="business" size={14} color="rgba(255,255,255,0.9)" />
                <Text style={styles.headerSummaryText} numberOfLines={1}>
                  {empresas.find(e => e.id_empresa === selectedEmpresa)?.nombre_empresa?.substring(0, 15) || 'Empresa'}
                </Text>
              </View>
            )}
            {selectedDate && (
              <View style={styles.headerSummaryItem}>
                <Ionicons name="calendar" size={14} color="rgba(255,255,255,0.9)" />
                <Text style={styles.headerSummaryText}>
                  {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                </Text>
              </View>
            )}
            {selectedTime && (
              <View style={styles.headerSummaryItem}>
                <Ionicons name="time" size={14} color="rgba(255,255,255,0.9)" />
                <Text style={styles.headerSummaryText}>{selectedTime}</Text>
              </View>
            )}
          </View>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* PASO 1: Selección de Servicios */}
        <View style={styles.stepContainer}>
          <View style={styles.stepHeader}>
            <View style={[styles.stepNumber, selectedService.length > 0 && styles.stepNumberActive]}>
              <Text style={[styles.stepNumberText, selectedService.length > 0 && styles.stepNumberTextActive]}>1</Text>
            </View>
            <Text style={styles.sectionTitle}>Selecciona los Servicios</Text>
          </View>

          {/* Banner de Suscripción */}
          {loadingSuscripcion ? (
            <View style={styles.suscripcionBanner}>
              <ActivityIndicator size="small" color="#0C553C" />
              <Text style={styles.suscripcionLoadingText}>Verificando suscripción...</Text>
            </View>
          ) : tieneSuscripcion ? (
            <View style={[
              styles.suscripcionBanner,
              serviciosDisponibles === 0 && styles.suscripcionBannerAgotada
            ]}>
              <View style={styles.suscripcionHeader}>
                <Ionicons name="star" size={20} color="#FFD700" style={styles.suscripcionIcon} />
                <Text style={styles.suscripcionTitulo}>
                  Plan {suscripcion?.plan?.nombre || 'Activo'}
                </Text>
              </View>
              <View style={styles.suscripcionInfo}>
                {serviciosDisponibles === -1 ? (
                  <Text style={styles.suscripcionDisponibles}>
                    <Ionicons name="gift-outline" size={16} color="#4CAF50" /> ¡Servicios ilimitados este mes!
                  </Text>
                ) : serviciosDisponibles > 0 ? (
                  <Text style={styles.suscripcionDisponibles}>
                    <Ionicons name="clipboard-outline" size={16} color="#2196F3" /> Te quedan <Text style={styles.suscripcionNumero}>{serviciosDisponibles}</Text> servicio(s) disponibles este mes
                  </Text>
                ) : (
                  <Text style={styles.suscripcionAgotada}>
                    <Ionicons name="warning-outline" size={16} color="#F44336" /> Has agotado tus servicios del plan este mes
                  </Text>
                )}
              </View>
              <Text style={styles.suscripcionHint}>
                Los servicios incluidos en tu plan están marcados con <Ionicons name="star" size={14} color="#FFD700" />
              </Text>
            </View>
          ) : (
            <View style={styles.sinSuscripcionBanner}>
              <Text style={styles.sinSuscripcionText}>
                <Ionicons name="bulb-outline" size={16} color="#FF9800" /> ¿Sabías que puedes ahorrar con nuestros planes de suscripción?
              </Text>
            </View>
          )}
          
          {/* Aviso de usar filtros */}
          {!filtroTipoVehiculo && !filtroTipoServicio && (
            <View style={styles.filterNotice}>
              <View style={styles.filterNoticeIconBg}>
                <Ionicons name="search" size={28} color="#0C553C" />
              </View>
              <Text style={styles.filterNoticeTitle}>¡Encuentra el servicio perfecto!</Text>
              <Text style={styles.filterNoticeText}>
                Usa los filtros para ver los servicios según tu necesidad
              </Text>
            </View>
          )}

          {/* Filtros */}
          <View style={styles.filtersContainer}>
            <View style={styles.filterHeaderRow}>
              <View style={styles.filterTitleContainer}>
                <Ionicons name="options" size={20} color="#0C553C" />
                <Text style={styles.filterSectionTitle}>Filtros</Text>
              </View>
              {(filtroTipoVehiculo || filtroTipoServicio) && (
                <TouchableOpacity 
                  style={styles.clearFiltersBtn} 
                  onPress={limpiarFiltros}
                  activeOpacity={0.7}
                >
                  <Ionicons name="refresh" size={16} color="#EF4444" />
                  <Text style={styles.clearFiltersBtnText}>Limpiar</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {/* Filtro por categoría de servicio */}
            <View style={styles.filterGroup}>
              <View style={styles.filterLabelRow}>
                <View style={styles.filterLabelIconBg}>
                  <Ionicons name="construct" size={14} color="#0C553C" />
                </View>
                <Text style={styles.filterLabel}>Categoría</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
                <View style={styles.filterOptionsRow}>
                  {categoriasServicio.map((tipo) => {
                    const isSelected = filtroTipoServicio === tipo;
                    return (
                      <TouchableOpacity
                        key={tipo}
                        style={[
                          styles.filterChip,
                          isSelected && styles.filterChipSelected
                        ]}
                        onPress={() => {
                          setFiltroTipoServicio(isSelected ? '' : tipo);
                        }}
                        activeOpacity={0.7}
                      >
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={16} color="#fff" style={styles.filterChipIcon} />
                        )}
                        <Text style={[
                          styles.filterChipText,
                          isSelected && styles.filterChipTextSelected
                        ]}>
                          {tipo}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            {/* Filtro por tipo de vehículo */}
            <View style={styles.filterGroup}>
              <View style={styles.filterLabelRow}>
                <View style={styles.filterLabelIconBg}>
                  <Ionicons name="car-sport" size={14} color="#0C553C" />
                </View>
                <Text style={styles.filterLabel}>Tipo de Vehículo</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
                <View style={styles.filterOptionsRow}>
                  {tiposVehiculoFiltro.map((tipo) => {
                    const isSelected = filtroTipoVehiculo === tipo;
                    return (
                      <TouchableOpacity
                        key={tipo}
                        style={[
                          styles.filterChip,
                          isSelected && styles.filterChipSelected
                        ]}
                        onPress={() => {
                          setFiltroTipoVehiculo(isSelected ? '' : tipo);
                        }}
                        activeOpacity={0.7}
                      >
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={16} color="#fff" style={styles.filterChipIcon} />
                        )}
                        <Text style={[
                          styles.filterChipText,
                          isSelected && styles.filterChipTextSelected
                        ]}>
                          {tipo}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            {/* Resultados y filtros activos */}
            {(filtroTipoVehiculo || filtroTipoServicio) && (
              <View style={styles.filterResultsContainer}>
                <View style={styles.filterResultsBadge}>
                  <Ionicons name="flash" size={16} color="#0C553C" />
                  <Text style={styles.filterResultsText}>
                    {serviciosFiltrados.length} {serviciosFiltrados.length === 1 ? 'servicio encontrado' : 'servicios encontrados'}
                  </Text>
                </View>
                <View style={styles.activeFiltersRow}>
                  {filtroTipoServicio && (
                    <TouchableOpacity 
                      style={styles.activeFilterTag}
                      onPress={() => setFiltroTipoServicio('')}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="construct" size={12} color="#0C553C" />
                      <Text style={styles.activeFilterTagText}>{filtroTipoServicio}</Text>
                      <View style={styles.activeFilterTagClose}>
                        <Ionicons name="close" size={12} color="#fff" />
                      </View>
                    </TouchableOpacity>
                  )}
                  {filtroTipoVehiculo && (
                    <TouchableOpacity 
                      style={styles.activeFilterTag}
                      onPress={() => setFiltroTipoVehiculo('')}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="car-sport" size={12} color="#0C553C" />
                      <Text style={styles.activeFilterTagText}>{filtroTipoVehiculo}</Text>
                      <View style={styles.activeFilterTagClose}>
                        <Ionicons name="close" size={12} color="#fff" />
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </View>
          
          {/* Lista de servicios (se muestra cuando hay filtros activos) */}
          {(filtroTipoVehiculo || filtroTipoServicio) && (
            <>
              <View style={styles.servicesContainer}>
                {serviciosFiltrados.length > 0 ? serviciosFiltrados.map((servicio: any) => {
                  const esPlan = esServicioDelPlan(servicio.id_servicio);
                  const isSelected = selectedService.includes(servicio.id_servicio);
                  
                  return (
                    <TouchableOpacity
                      key={servicio.id_servicio}
                      style={[
                        styles.serviceOption,
                        esPlan && !isSelected && styles.serviceOptionPlan,
                        isSelected && styles.selectedOption
                      ]}
                      onPress={() => toggleServicio(servicio.id_servicio)}
                    >
                      {/* Badge de Plan */}
                      {esPlan && (
                        <View style={[
                          styles.planBadge,
                          isSelected && styles.planBadgeSelected
                        ]}>
                          <Text style={[
                            styles.planBadgeText,
                            isSelected && styles.planBadgeTextSelected
                          ]}>
                            <Ionicons name="star" size={12} color="#FFD700" /> Incluido en tu plan
                          </Text>
                        </View>
                      )}
                      
                      <View style={styles.serviceHeader}>
                        <Text style={[
                          styles.serviceName,
                          esPlan && !isSelected && styles.serviceNamePlan,
                          isSelected && styles.selectedText
                        ]}>
                          {servicio.nombre_servicio}
                        </Text>
                        <Text style={[
                          styles.servicePrice,
                          esPlan && !isSelected && styles.servicePricePlan,
                          isSelected && styles.selectedText
                        ]}>
                          ${parseFloat(servicio.precio).toLocaleString()}
                        </Text>
                      </View>
                      <Text style={[
                        styles.serviceDuration,
                        isSelected && styles.selectedSubText
                      ]}>
                        {servicio.descripcion}
                      </Text>
                      {/* Cantidad de empresas que ofrecen el servicio */}
                      <View style={[
                        styles.empresasCountContainer,
                        esPlan && !isSelected && styles.empresasCountContainerPlan,
                        isSelected && styles.empresasCountContainerSelected
                      ]}>
                        <Text style={[
                          styles.empresasCountText,
                          isSelected && styles.empresasCountTextSelected
                        ]}>
                          <Ionicons name="business-outline" size={12} color="#666" /> {servicio.cantidad_empresas || 0} {(servicio.cantidad_empresas === 1) ? 'empresa lo ofrece' : 'empresas lo ofrecen'}
                        </Text>
                      </View>
                      {servicio.tipo_vehiculo_aplicable && (
                        <Text style={[
                          styles.serviceVehicleType,
                          isSelected && styles.selectedSubText
                        ]}>
                          Aplica para: {servicio.tipo_vehiculo_aplicable}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                }) : (
                  <View style={styles.noResultsContainer}>
                    <Text style={styles.noResultsText}>
                      No se encontraron servicios con los filtros seleccionados.
                    </Text>
                    <Text style={styles.noResultsSubtext}>
                      Intenta con otros filtros.
                    </Text>
                  </View>
                )}
              </View>
            </>
          )}

          {selectedService.length > 0 && (
            <View style={styles.totalContainer}>
              <Text style={styles.totalText}>Total: ${calcularTotal().toLocaleString()}</Text>
            </View>
          )}
        </View>

        {/* PASO 2: Selección de Empresa (solo si hay servicios seleccionados) */}
        {selectedService.length > 0 && (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <View style={[styles.stepNumber, selectedEmpresa ? styles.stepNumberActive : null]}>
                <Text style={[styles.stepNumberText, selectedEmpresa ? styles.stepNumberTextActive : null]}>2</Text>
              </View>
              <Text style={styles.sectionTitle}>Selecciona la Empresa</Text>
            </View>

            {/* Botón GPS para ordenar por cercanía */}
            <View style={styles.gpsContainer}>
              <TouchableOpacity 
                style={[
                  styles.gpsButton,
                  userLocation && styles.gpsButtonActive
                ]}
                onPress={obtenerUbicacion}
                disabled={loadingLocation}
              >
                {loadingLocation ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="location" size={18} color="#fff" style={styles.gpsButtonIcon} />
                    <Text style={styles.gpsButtonText}>
                      {userLocation ? 'Ubicación obtenida' : 'Usar mi ubicación'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              
              {userLocation && (
                <TouchableOpacity 
                  style={[
                    styles.ordenarButton,
                    ordenarPorDistancia && styles.ordenarButtonActive
                  ]}
                  onPress={() => setOrdenarPorDistancia(!ordenarPorDistancia)}
                >
                  <Text style={[
                    styles.ordenarButtonText,
                    ordenarPorDistancia && styles.ordenarButtonTextActive
                  ]}>
                    {ordenarPorDistancia ? <><Ionicons name="checkmark" size={14} color="#fff" /> Más cercanas primero</> : 'Ordenar por cercanía'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {locationError && (
              <Text style={styles.locationErrorText}>{locationError}</Text>
            )}
            
            {loadingEmpresas ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#0C553C" />
                <Text style={styles.loadingText}>Buscando empresas...</Text>
              </View>
            ) : empresasConDistancia.length > 0 ? (
              <View style={styles.empresasContainer}>
                {empresasConDistancia.map((empresa: any, index: number) => (
                  <TouchableOpacity
                    key={empresa.id_empresa}
                    style={[
                      styles.empresaCard,
                      selectedEmpresa === empresa.id_empresa && styles.empresaCardSelected
                    ]}
                    onPress={() => setSelectedEmpresa(empresa.id_empresa)}
                  >
                    {/* Badge de distancia */}
                    {empresa.distancia !== null && (
                      <View style={[
                        styles.distanciaBadge,
                        index === 0 && ordenarPorDistancia && styles.distanciaBadgeCercana
                      ]}>
                        <Text style={[
                          styles.distanciaBadgeText,
                          index === 0 && ordenarPorDistancia && styles.distanciaBadgeTextCercana
                        ]}>
                          {index === 0 && ordenarPorDistancia ? <><Ionicons name="trophy" size={12} color="#FFD700" /> Más cercana • </> : ''}
                          {formatearDistancia(empresa.distancia)}
                        </Text>
                      </View>
                    )}

                    {/* Nombre de la empresa */}
                    <Text style={[
                      styles.empresaNombre,
                      selectedEmpresa === empresa.id_empresa && styles.selectedText
                    ]}>
                      {empresa.nombre_empresa}
                    </Text>

                    {/* Dirección */}
                    <View style={styles.empresaInfoRow}>
                      <Ionicons name="location-outline" size={16} color="#666" style={styles.empresaInfoIcon} />
                      <Text style={[
                        styles.empresaDireccion,
                        selectedEmpresa === empresa.id_empresa && styles.selectedSubText
                      ]} numberOfLines={2}>
                        {empresa.direccion}
                      </Text>
                    </View>

                    {/* Teléfono */}
                    {empresa.telefono && (
                      <View style={styles.empresaInfoRow}>
                        <Ionicons name="call-outline" size={16} color="#666" style={styles.empresaInfoIcon} />
                        <Text style={[
                          styles.empresaTelefono,
                          selectedEmpresa === empresa.id_empresa && styles.selectedSubText
                        ]}>
                          {empresa.telefono}
                        </Text>
                      </View>
                    )}

                    {/* Email */}
                    {empresa.email && (
                      <View style={styles.empresaInfoRow}>
                        <Ionicons name="mail-outline" size={16} color="#666" style={styles.empresaInfoIcon} />
                        <Text style={[
                          styles.empresaHorario,
                          selectedEmpresa === empresa.id_empresa && styles.selectedSubText
                        ]}>
                          {empresa.email}
                        </Text>
                      </View>
                    )}

                    {/* Botones de acción */}
                    <View style={styles.empresaAcciones}>
                      {empresa.telefono && (
                        <TouchableOpacity 
                          style={[
                            styles.accionButton,
                            selectedEmpresa === empresa.id_empresa && styles.accionButtonSelected
                          ]}
                          onPress={(e) => {
                            e.stopPropagation();
                            llamarEmpresa(empresa.telefono);
                          }}
                        >
                          <Text style={styles.accionButtonText}><Ionicons name="call" size={14} color="#0C553C" /> Llamar</Text>
                        </TouchableOpacity>
                      )}
                      
                      {empresa.latitud && empresa.longitud && (
                        <TouchableOpacity 
                          style={[
                            styles.accionButton,
                            selectedEmpresa === empresa.id_empresa && styles.accionButtonSelected
                          ]}
                          onPress={(e) => {
                            e.stopPropagation();
                            abrirMapa(empresa);
                          }}
                        >
                          <Text style={styles.accionButtonText}><Ionicons name="map-outline" size={14} color="#0C553C" /> Ver mapa</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={styles.noDataText}>
                No hay empresas disponibles con estos servicios
              </Text>
            )}
          </View>
        )}

        {/* PASO 3: Selección de Fecha (solo si hay empresa seleccionada) */}
        {selectedEmpresa && (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <View style={[styles.stepNumber, selectedDate && styles.stepNumberActive]}>
                <Text style={[styles.stepNumberText, selectedDate && styles.stepNumberTextActive]}>3</Text>
              </View>
              <Text style={styles.sectionTitle}>Selecciona la Fecha</Text>
            </View>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.datesScrollView}
              contentContainerStyle={styles.datesScrollContent}
            >
              {dates.map((date, index) => {
                const fechaObj = new Date(date.id + 'T00:00:00');
                const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
                const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                const diaSemana = diasSemana[fechaObj.getDay()];
                const numDia = fechaObj.getDate();
                const mes = meses[fechaObj.getMonth()];
                const esHoy = index === 0;
                const esManana = index === 1;
                
                return (
                  <TouchableOpacity
                    key={date.id}
                    style={[
                      styles.dateCard,
                      selectedDate === date.id && styles.dateCardSelected,
                      esHoy && styles.dateCardHoy
                    ]}
                    onPress={() => {
                      setSelectedDate(date.id);
                      setSelectedTime('');
                    }}
                  >
                    {esHoy && (
                      <View style={[styles.dateBadge, selectedDate === date.id && styles.dateBadgeSelected]}>
                        <Text style={[styles.dateBadgeText, selectedDate === date.id && styles.dateBadgeTextSelected]}>Hoy</Text>
                      </View>
                    )}
                    {esManana && (
                      <View style={[styles.dateBadge, selectedDate === date.id && styles.dateBadgeSelected]}>
                        <Text style={[styles.dateBadgeText, selectedDate === date.id && styles.dateBadgeTextSelected]}>Mañana</Text>
                      </View>
                    )}
                    <Text style={[
                      styles.dateDiaSemana,
                      selectedDate === date.id && styles.selectedText
                    ]}>
                      {diaSemana}
                    </Text>
                    <Text style={[
                      styles.dateNumero,
                      selectedDate === date.id && styles.selectedText
                    ]}>
                      {numDia}
                    </Text>
                    <Text style={[
                      styles.dateMes,
                      selectedDate === date.id && styles.selectedSubText
                    ]}>
                      {mes}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* PASO 4: Selección de Hora (solo si hay fecha seleccionada) */}
        {selectedDate && selectedEmpresa && (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <View style={[styles.stepNumber, selectedTime && styles.stepNumberActive]}>
                <Text style={[styles.stepNumberText, selectedTime && styles.stepNumberTextActive]}>4</Text>
              </View>
              <Text style={styles.sectionTitle}>Selecciona la Hora</Text>
            </View>
            
            {/* Leyenda de disponibilidad */}
            <View style={styles.horarioLeyenda}>
              <View style={styles.leyendaItem}>
                <View style={[styles.leyendaColor, { backgroundColor: '#E8F5E9' }]} />
                <Text style={styles.leyendaText}>Disponible</Text>
              </View>
              <View style={styles.leyendaItem}>
                <View style={[styles.leyendaColor, { backgroundColor: '#FFEBEE' }]} />
                <Text style={styles.leyendaText}>Ocupado</Text>
              </View>
              {esHoy && (
                <View style={styles.leyendaItem}>
                  <View style={[styles.leyendaColor, { backgroundColor: '#E0E0E0' }]} />
                  <Text style={styles.leyendaText}>Pasado</Text>
                </View>
              )}
              <View style={styles.leyendaItem}>
                <View style={[styles.leyendaColor, { backgroundColor: '#0C553C' }]} />
                <Text style={styles.leyendaText}>Seleccionado</Text>
              </View>
            </View>
            
            {loadingHorarios ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#0C553C" />
                <Text style={{ marginTop: 10, color: '#666' }}>Cargando horarios...</Text>
              </View>
            ) : todosLosHorarios.length > 0 ? (
              <View style={styles.timeSlotsContainer}>
                {todosLosHorarios.map((horario) => {
                  const isOcupado = horario.ocupado;
                  const isPasado = horario.pasado;
                  const isDisponible = horario.disponible;
                  const isSelected = selectedTime === horario.hora;
                  const isDisabled = isOcupado || isPasado;
                  
                  return (
                    <TouchableOpacity
                      key={horario.hora}
                      style={[
                        styles.timeSlot,
                        isOcupado && styles.timeSlotOcupado,
                        isPasado && styles.timeSlotPasado,
                        isSelected && styles.selectedOption
                      ]}
                      onPress={() => {
                        if (isDisponible) {
                          setSelectedTime(horario.hora);
                        } else if (isOcupado) {
                          Alert.alert(
                            'Horario No Disponible', 
                            'Este horario ya está reservado. Por favor selecciona otro horario disponible.',
                            [{ text: 'Entendido' }]
                          );
                        } else if (isPasado) {
                          Alert.alert(
                            'Horario Pasado', 
                            'Este horario ya pasó. Por favor selecciona un horario futuro.',
                            [{ text: 'Entendido' }]
                          );
                        }
                      }}
                      disabled={isDisabled}
                    >
                      <View style={styles.timeSlotContent}>
                        <Text style={[
                          styles.timeText,
                          isOcupado && styles.timeTextOcupado,
                          isPasado && styles.timeTextPasado,
                          isSelected && styles.selectedText
                        ]}>
                          {horario.hora}
                        </Text>
                        {isOcupado ? (
                          <View style={styles.ocupadoBadge}>
                            <Ionicons name="lock-closed" size={12} color="#fff" />
                          </View>
                        ) : isPasado ? (
                          <View style={styles.pasadoBadge}>
                            <Ionicons name="time-outline" size={12} color="#fff" />
                          </View>
                        ) : (
                          <View style={styles.disponibleBadge}>
                            <Ionicons name="checkmark" size={14} color="#fff" />
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.noHorariosText}>
                No hay horarios disponibles para esta fecha
              </Text>
            )}
            
            {/* Resumen de disponibilidad */}
            {todosLosHorarios.length > 0 && (
              <View style={styles.disponibilidadResumen}>
                <Text style={styles.disponibilidadTexto}>
                  <Ionicons name="stats-chart-outline" size={14} color="#1565C0" /> {horariosDisponibles.length} disponibles de {todosLosHorarios.length} horarios
                </Text>
                {horasOcupadas.length > 0 && (
                  <Text style={styles.ocupadosTexto}>
                    {horasOcupadas.length} horarios ya reservados
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* Botón de Confirmar */}
        {selectedService.length > 0 && selectedEmpresa && selectedDate && selectedTime && (
          <TouchableOpacity 
            style={[styles.bookButton, loading && styles.bookButtonDisabled]} 
            onPress={handleBookAppointment}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.bookButtonText}>Confirmar Reserva</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* ============================================ */}
      {/* MODAL DE CONFIRMACIÓN DE RESERVA */}
      {/* ============================================ */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            {/* Header del modal */}
            <View style={styles.confirmModalHeader}>
              <View style={styles.confirmModalIconContainer}>
                <Ionicons name="clipboard-outline" size={32} color="#fff" />
              </View>
              <Text style={styles.confirmModalTitle}>Confirmar Reserva</Text>
              <Text style={styles.confirmModalSubtitle}>Revisa los detalles antes de confirmar</Text>
            </View>

            {/* Contenido del modal */}
            <ScrollView style={styles.confirmModalContent} showsVerticalScrollIndicator={false}>
              {confirmModalData && (
                <>
                  {/* Empresa */}
                  <View style={styles.confirmDetailRow}>
                    <View style={styles.confirmDetailIconBg}>
                      <Ionicons name="business" size={18} color="#0C553C" />
                    </View>
                    <View style={styles.confirmDetailTextContainer}>
                      <Text style={styles.confirmDetailLabel}>Empresa</Text>
                      <Text style={styles.confirmDetailValue}>{confirmModalData.empresa}</Text>
                    </View>
                  </View>

                  {/* Servicios */}
                  <View style={styles.confirmDetailRow}>
                    <View style={styles.confirmDetailIconBg}>
                      <Ionicons name="construct" size={18} color="#0C553C" />
                    </View>
                    <View style={styles.confirmDetailTextContainer}>
                      <Text style={styles.confirmDetailLabel}>Servicios ({confirmModalData.servicios?.length})</Text>
                      <View style={styles.confirmServicesContainer}>
                        {confirmModalData.servicios?.map((s: any, idx: number) => (
                          <View key={idx} style={styles.confirmServiceChip}>
                            <Ionicons name="checkmark-circle" size={12} color="#0C553C" />
                            <Text style={styles.confirmServiceChipText}>{s.nombre_servicio}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>

                  {/* Fecha y Hora */}
                  <View style={styles.confirmDateTimeRow}>
                    <View style={styles.confirmDateBox}>
                      <Ionicons name="calendar" size={20} color="#0C553C" />
                      <Text style={styles.confirmDateLabel}>Fecha</Text>
                      <Text style={styles.confirmDateValue}>{confirmModalData.fecha}</Text>
                    </View>
                    <View style={styles.confirmTimeBox}>
                      <Ionicons name="time" size={20} color="#0C553C" />
                      <Text style={styles.confirmTimeLabel}>Hora</Text>
                      <Text style={styles.confirmTimeValue}>{confirmModalData.hora}</Text>
                    </View>
                  </View>

                  {/* Vehículo */}
                  <View style={styles.confirmDetailRow}>
                    <View style={styles.confirmDetailIconBg}>
                      <Ionicons name="car-sport" size={18} color="#0C553C" />
                    </View>
                    <View style={styles.confirmDetailTextContainer}>
                      <Text style={styles.confirmDetailLabel}>Vehículo</Text>
                      <Text style={styles.confirmDetailValue}>
                        {confirmModalData.placa} • {confirmModalData.tipoVehiculo}
                      </Text>
                    </View>
                  </View>

                  {/* Conductor */}
                  <View style={styles.confirmDetailRow}>
                    <View style={styles.confirmDetailIconBg}>
                      <Ionicons name="person" size={18} color="#0C553C" />
                    </View>
                    <View style={styles.confirmDetailTextContainer}>
                      <Text style={styles.confirmDetailLabel}>Conductor</Text>
                      <Text style={styles.confirmDetailValue}>{confirmModalData.conductor}</Text>
                    </View>
                  </View>

                  {/* Total */}
                  <View style={styles.confirmTotalContainer}>
                    <View style={styles.confirmTotalRow}>
                      <Text style={styles.confirmTotalLabel}>Total a pagar</Text>
                      <Text style={styles.confirmTotalValue}>
                        ${confirmModalData.total?.toLocaleString()}
                      </Text>
                    </View>
                  </View>
                </>
              )}
            </ScrollView>

            {/* Botones del modal */}
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity 
                style={styles.confirmCancelBtn}
                onPress={() => setShowConfirmModal(false)}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={20} color="#666" />
                <Text style={styles.confirmCancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.confirmConfirmBtn}
                onPress={procesarReserva}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.confirmConfirmBtnText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================ */}
      {/* MODAL DE ÉXITO/ERROR */}
      {/* ============================================ */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModal}>
            {/* Icono animado */}
            <View style={[
              styles.successIconContainer,
              !successModalData.isSuccess && styles.errorIconContainer
            ]}>
              <View style={[
                styles.successIconCircle,
                !successModalData.isSuccess && styles.errorIconCircle
              ]}>
                <Ionicons 
                  name={successModalData.isSuccess ? "checkmark" : "close"} 
                  size={48} 
                  color="#fff" 
                />
              </View>
              {successModalData.isSuccess && (
                <>
                  <View style={[styles.confettiDot, styles.confetti1]} />
                  <View style={[styles.confettiDot, styles.confetti2]} />
                  <View style={[styles.confettiDot, styles.confetti3]} />
                  <View style={[styles.confettiDot, styles.confetti4]} />
                </>
              )}
            </View>

            {/* Título y mensaje */}
            <Text style={[
              styles.successTitle,
              !successModalData.isSuccess && styles.errorTitle
            ]}>
              {successModalData.title}
            </Text>
            <Text style={styles.successMessage}>
              {successModalData.message}
            </Text>

            {/* Botones según el resultado */}
            {successModalData.isSuccess ? (
              <View style={styles.successButtonsContainer}>
                <TouchableOpacity 
                  style={styles.successSecondaryBtn}
                  onPress={() => {
                    setShowSuccessModal(false);
                    router.back();
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="home-outline" size={18} color="#0C553C" />
                  <Text style={styles.successSecondaryBtnText}>Ir al inicio</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.successPrimaryBtn}
                  onPress={() => {
                    setShowSuccessModal(false);
                    router.push('./my-appointments');
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="calendar" size={18} color="#fff" />
                  <Text style={styles.successPrimaryBtnText}>Ver reservas</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.errorCloseBtn}
                onPress={() => setShowSuccessModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.errorCloseBtnText}>Entendido</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  // ============================================
  // HEADER MEJORADO
  // ============================================
  header: {
    backgroundColor: '#0C553C',
    paddingTop: 50,
    paddingBottom: 16,
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
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  headerSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: 40,
    justifyContent: 'flex-end',
  },
  headerStepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  headerStepDotActive: {
    backgroundColor: '#4ADE80',
  },
  headerSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  headerSummaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 5,
  },
  headerSummaryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 15,
  },
  empresasContainer: {
    marginBottom: 10,
  },
  empresaOption: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  empresaNombre: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  empresaDireccion: {
    fontSize: 13,
    color: '#666',
  },
  // ============================================
  // SERVICIOS MEJORADOS
  // ============================================
  servicesContainer: {
    marginBottom: 10,
  },
  serviceOption: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  selectedOption: {
    backgroundColor: '#0C553C',
    borderColor: '#0C553C',
    shadowColor: '#0C553C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0C553C',
  },
  serviceDuration: {
    fontSize: 13,
    color: '#666',
    marginTop: 5,
  },
  empresasCountContainer: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  empresasCountContainerSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  empresasCountText: {
    fontSize: 12,
    color: '#1565C0',
    fontWeight: '600',
  },
  empresasCountTextSelected: {
    color: '#fff',
  },
  selectedText: {
    color: '#fff',
  },
  selectedSubText: {
    color: '#fff',
    opacity: 0.9,
  },
  // ============================================
  // TOTAL MEJORADO
  // ============================================
  totalContainer: {
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    padding: 16,
    marginVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#86EFAC',
  },
  totalText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0C553C',
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  pickerLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    fontWeight: '600',
  },
  vehicleTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  vehicleTypeButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    width: '31%',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedVehicleType: {
    backgroundColor: '#0C553C',
    borderColor: '#0C553C',
  },
  vehicleTypeText: {
    fontSize: 13,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
  switchContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    marginBottom: 15,
  },
  switchButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  switchButtonActive: {
    backgroundColor: '#0C553C',
  },
  switchText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontWeight: '600',
  },
  switchTextActive: {
    color: '#fff',
  },
  // Estilos mejorados para selector de fechas
  datesScrollView: {
    marginBottom: 10,
  },
  datesScrollContent: {
    paddingRight: 10,
    gap: 10,
  },
  dateCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    width: 75,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dateCardSelected: {
    backgroundColor: '#0C553C',
    borderColor: '#0C553C',
  },
  dateCardHoy: {
    borderColor: '#4CAF50',
  },
  dateBadge: {
    position: 'absolute',
    top: -8,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  dateBadgeSelected: {
    backgroundColor: '#fff',
  },
  dateBadgeText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: '700',
  },
  dateBadgeTextSelected: {
    color: '#0C553C',
  },
  dateDiaSemana: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    marginTop: 4,
  },
  dateNumero: {
    fontSize: 24,
    color: '#333',
    fontWeight: '700',
    marginVertical: 2,
  },
  dateMes: {
    fontSize: 11,
    color: '#888',
    fontWeight: '500',
  },
  datesContainer: {
    marginBottom: 10,
  },
  dateOption: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dateText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  timeSlotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  timeSlot: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    width: '18%',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  timeText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  noHorariosText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    padding: 20,
  },
  // ============================================
  // BOTÓN CONFIRMAR MEJORADO
  // ============================================
  bookButton: {
    backgroundColor: '#0C553C',
    borderRadius: 16,
    paddingVertical: 18,
    marginTop: 10,
    marginBottom: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0C553C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  bookButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  // ============================================
  // PASOS Y SECCIONES MEJORADOS
  // ============================================
  stepContainer: {
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberActive: {
    backgroundColor: '#0C553C',
  },
  stepNumberText: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '700',
  },
  stepNumberTextActive: {
    color: '#fff',
  },
  noDataText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 20,
  },
  // ============================================
  // FILTROS MEJORADOS
  // ============================================
  filterNotice: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  filterNoticeIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterNoticeIcon: {
    fontSize: 32,
    marginBottom: 10,
  },
  filterNoticeTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 6,
    textAlign: 'center',
  },
  filterNoticeText: {
    fontSize: 14,
    color: '#15803D',
    textAlign: 'center',
    lineHeight: 20,
  },
  filtersContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#0C553C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  filterHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  filterSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: -0.3,
  },
  clearFiltersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  clearFiltersBtnText: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '700',
  },
  filterGroup: {
    marginBottom: 18,
  },
  filterLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  filterLabelIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },
  filterScrollView: {
    marginBottom: 0,
  },
  filterOptionsRow: {
    flexDirection: 'row',
    paddingRight: 16,
    gap: 10,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  filterChipSelected: {
    backgroundColor: '#0C553C',
    borderColor: '#0C553C',
    shadowColor: '#0C553C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  filterChipIcon: {
    marginRight: 6,
  },
  filterChipText: {
    fontSize: 14,
    color: '#555',
    fontWeight: '600',
  },
  filterChipTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  filterResultsContainer: {
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    padding: 14,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  filterResultsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  filterResultsText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0C553C',
  },
  activeFiltersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  activeFilterTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  activeFilterTagText: {
    fontSize: 13,
    color: '#0C553C',
    fontWeight: '700',
  },
  activeFilterTagClose: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Estilos antiguos mantenidos para compatibilidad
  filterButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  resultCountContainer: {
    flex: 1,
    marginRight: 10,
  },
  resultCountText: {
    fontSize: 14,
    color: '#0C553C',
    fontWeight: '600',
  },
  limpiarFiltrosButton: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  limpiarFiltrosText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  filtrosActivosContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  filtrosActivosTitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  filtrosActivosTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filtroActivoTag: {
    backgroundColor: '#E8F5E9',
    borderRadius: 15,
    paddingVertical: 5,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 5,
  },
  filtroActivoTagText: {
    fontSize: 12,
    color: '#0C553C',
    fontWeight: '600',
  },
  serviciosResultadoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    fontStyle: 'italic',
  },
  serviceVehicleType: {
    fontSize: 12,
    color: '#888',
    marginTop: 5,
    fontStyle: 'italic',
  },
  noResultsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  noResultsSubtext: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
  },
  // Estilos de Suscripción
  suscripcionBanner: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  suscripcionBannerAgotada: {
    backgroundColor: '#FFF3E0',
    borderLeftColor: '#FF9800',
  },
  suscripcionLoadingText: {
    color: '#666',
    marginLeft: 10,
    fontSize: 14,
  },
  suscripcionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  suscripcionIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  suscripcionTitulo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  suscripcionInfo: {
    marginBottom: 8,
  },
  suscripcionDisponibles: {
    fontSize: 14,
    color: '#333',
  },
  suscripcionNumero: {
    fontWeight: 'bold',
    color: '#2E7D32',
    fontSize: 16,
  },
  suscripcionAgotada: {
    fontSize: 14,
    color: '#E65100',
    fontWeight: '600',
  },
  suscripcionHint: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 5,
  },
  sinSuscripcionBanner: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 12,
    marginBottom: 15,
  },
  sinSuscripcionText: {
    fontSize: 13,
    color: '#1565C0',
    textAlign: 'center',
  },
  // Estilos para servicios del plan
  serviceOptionPlan: {
    backgroundColor: '#FFF8E1',
    borderColor: '#FFD54F',
    borderWidth: 2,
  },
  serviceNamePlan: {
    color: '#F57F17',
  },
  servicePricePlan: {
    color: '#F57F17',
  },
  empresasCountContainerPlan: {
    backgroundColor: '#FFF3E0',
  },
  planBadge: {
    backgroundColor: '#FFD54F',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  planBadgeSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  planBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#F57F17',
  },
  planBadgeTextSelected: {
    color: '#fff',
  },
  // Estilos para GPS y ubicación
  gpsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
    gap: 10,
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1565C0',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
  },
  gpsButtonActive: {
    backgroundColor: '#4CAF50',
  },
  gpsButtonIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  gpsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  ordenarButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  ordenarButtonActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  ordenarButtonText: {
    color: '#666',
    fontSize: 13,
    fontWeight: '500',
  },
  ordenarButtonTextActive: {
    color: '#2E7D32',
  },
  locationErrorText: {
    color: '#D32F2F',
    fontSize: 13,
    marginBottom: 10,
    textAlign: 'center',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  // Estilos para tarjetas de empresa mejoradas
  empresaCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 15,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  empresaCardSelected: {
    backgroundColor: '#0C553C',
    borderColor: '#0C553C',
  },
  distanciaBadge: {
    position: 'absolute',
    top: -10,
    right: 10,
    backgroundColor: '#E3F2FD',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  distanciaBadgeCercana: {
    backgroundColor: '#FFD54F',
  },
  distanciaBadgeText: {
    fontSize: 11,
    color: '#1565C0',
    fontWeight: '600',
  },
  distanciaBadgeTextCercana: {
    color: '#F57F17',
  },
  calificacionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 8,
  },
  calificacionEstrellas: {
    fontSize: 12,
    marginRight: 5,
  },
  calificacionTexto: {
    fontSize: 12,
    color: '#666',
  },
  empresaDescripcion: {
    fontSize: 13,
    color: '#666',
    marginBottom: 10,
    lineHeight: 18,
  },
  empresaInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  empresaInfoIcon: {
    fontSize: 14,
    marginRight: 8,
    width: 20,
  },
  empresaHorario: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  empresaTelefono: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  empresaAcciones: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 10,
  },
  accionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  accionButtonSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  accionButtonText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  // Estilos para horarios con disponibilidad
  horarioLeyenda: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 15,
    marginBottom: 15,
    paddingVertical: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  leyendaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  leyendaColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  leyendaText: {
    fontSize: 11,
    color: '#666',
  },
  timeSlotOcupado: {
    backgroundColor: '#FFEBEE',
    borderColor: '#EF5350',
    opacity: 0.7,
  },
  timeSlotPasado: {
    backgroundColor: '#F5F5F5',
    borderColor: '#BDBDBD',
    opacity: 0.5,
  },
  timeSlotContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  timeTextOcupado: {
    color: '#C62828',
    textDecorationLine: 'line-through',
  },
  timeTextPasado: {
    color: '#9E9E9E',
    textDecorationLine: 'line-through',
  },
  ocupadoBadge: {
    backgroundColor: '#EF5350',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ocupadoBadgeText: {
    fontSize: 10,
  },
  disponibleBadge: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disponibleBadgeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  pasadoBadge: {
    backgroundColor: '#9E9E9E',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pasadoBadgeText: {
    fontSize: 10,
  },
  disponibilidadResumen: {
    marginTop: 15,
    padding: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    alignItems: 'center',
  },
  disponibilidadTexto: {
    fontSize: 14,
    color: '#1565C0',
    fontWeight: '600',
  },
  ocupadosTexto: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },

  // ============================================
  // ESTILOS MODAL CONFIRMACIÓN
  // ============================================
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModal: {
    backgroundColor: '#fff',
    borderRadius: 24,
    width: '100%',
    maxHeight: '85%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
  },
  confirmModalHeader: {
    backgroundColor: '#0C553C',
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  confirmModalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  confirmModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  confirmModalSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  confirmModalContent: {
    padding: 20,
    paddingBottom: 120,
    maxHeight: 450,
  },
  confirmDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  confirmDetailIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  confirmDetailTextContainer: {
    flex: 1,
  },
  confirmDetailLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  confirmDetailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  confirmServicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  confirmServiceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  confirmServiceChipText: {
    fontSize: 12,
    color: '#0C553C',
    fontWeight: '500',
  },
  confirmDateTimeRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  confirmDateBox: {
    flex: 1,
    backgroundColor: '#F0FDF4',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  confirmDateLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 6,
    textTransform: 'uppercase',
  },
  confirmDateValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0C553C',
    marginTop: 2,
    textAlign: 'center',
  },
  confirmTimeBox: {
    flex: 0.6,
    backgroundColor: '#F0FDF4',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  confirmTimeLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 6,
    textTransform: 'uppercase',
  },
  confirmTimeValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0C553C',
    marginTop: 2,
  },
  confirmTotalContainer: {
    marginTop: 24,
    marginBottom: 10,
    backgroundColor: '#0C553C',
    borderRadius: 14,
    padding: 18,
  },
  confirmTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confirmTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  confirmTotalValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  confirmModalButtons: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  confirmCancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
  },
  confirmCancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  confirmConfirmBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0C553C',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#0C553C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  confirmConfirmBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },

  // ============================================
  // ESTILOS MODAL ÉXITO/ERROR
  // ============================================
  successModal: {
    backgroundColor: '#fff',
    borderRadius: 24,
    width: '100%',
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
  },
  successIconContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  errorIconContainer: {},
  successIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#0C553C',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0C553C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  errorIconCircle: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
  },
  confettiDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  confetti1: {
    backgroundColor: '#FFD700',
    top: -5,
    left: 10,
  },
  confetti2: {
    backgroundColor: '#22C55E',
    top: 0,
    right: -5,
  },
  confetti3: {
    backgroundColor: '#3B82F6',
    bottom: 10,
    left: -8,
  },
  confetti4: {
    backgroundColor: '#EC4899',
    bottom: 0,
    right: 5,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0C553C',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorTitle: {
    color: '#EF4444',
  },
  successMessage: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  successButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  successSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  successSecondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0C553C',
  },
  successPrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0C553C',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#0C553C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  successPrimaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  errorCloseBtn: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  errorCloseBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
});