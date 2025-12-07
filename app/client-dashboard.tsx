import { StyleSheet, View, Text, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getReservasUsuario, Reserva, User, getProfile, getMiSuscripcion, Suscripcion } from '../services/api';
import { Ionicons, MaterialIcons, FontAwesome5, Feather } from '@expo/vector-icons';

export default function ClientDashboard() {
  // Dashboard principal del cliente
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [userInitial, setUserInitial] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [cancelledCount, setCancelledCount] = useState(0);
  const [expiredCount, setExpiredCount] = useState(0);
  const [nextAppointment, setNextAppointment] = useState<Reserva | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [miSuscripcion, setMiSuscripcion] = useState<Suscripcion | null>(null);
  const [imageLoadError, setImageLoadError] = useState(false);

  useEffect(() => {
    loadUserData();
    updateGreeting();
    loadSuscripcion();
  }, []);

  const loadSuscripcion = async () => {
    try {
      const response = await getMiSuscripcion();
      if (response.success && response.data) {
        setMiSuscripcion(response.data);
      }
    } catch (error) {
      console.error('Error cargando suscripción:', error);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchStats(userId);
    }
  }, [userId]);

  const loadUserData = async () => {
    try {
      // Primero intentar obtener datos frescos del backend
      const profileResponse = await getProfile();
      
      if (profileResponse.success && profileResponse.data) {
        const user = profileResponse.data;
        console.log('[Dashboard] User from API:', user);
        
        const fullName = user.nombre_completo || user.nombre_usuario || 'Usuario';
        setUserName(fullName);
        
        // Obtener la inicial del nombre
        const initial = fullName.charAt(0).toUpperCase();
        setUserInitial(initial);
        
        // Cargar foto de perfil - validar que sea una URL válida
        const profilePic = user.profile_picture;
        console.log('[Dashboard] profile_picture recibido:', profilePic);
        
        if (profilePic && typeof profilePic === 'string' && profilePic.trim() !== '') {
          let cleanUrl = profilePic.trim();
          
          // Corregir URL duplicada de Cloudinary (bug del backend)
          // Detecta: https://res.cloudinary.com/.../upload/https://res.cloudinary.com/.../upload/...
          const cloudinaryUploadPattern = 'cloudinary.com/ducn8dj4o/image/upload/';
          const firstIndex = cleanUrl.indexOf(cloudinaryUploadPattern);
          const lastIndex = cleanUrl.lastIndexOf(cloudinaryUploadPattern);
          
          if (firstIndex !== -1 && lastIndex !== -1 && firstIndex !== lastIndex) {
            // La URL está duplicada, tomar solo la segunda parte
            const correctPart = cleanUrl.substring(lastIndex);
            cleanUrl = 'https://res.' + correctPart;
            console.log('[Dashboard] 🔧 URL corregida (estaba duplicada):', cleanUrl);
          }
          
          // Verificar que sea una URL válida
          const isValidUrl = cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://');
          
          if (isValidUrl) {
            console.log('[Dashboard] ✅ Estableciendo foto de perfil:', cleanUrl);
            setProfilePicture(cleanUrl);
            setImageLoadError(false);
          } else {
            console.log('[Dashboard] ❌ URL de imagen inválida:', cleanUrl);
            setProfilePicture(null);
          }
        } else {
          console.log('[Dashboard] ⚠️ No hay foto de perfil');
          setProfilePicture(null);
        }
        
        const id = user.id || (user as any).id_usuario;
        if (id) {
          setUserId(id);
        }
        
        // Actualizar AsyncStorage con datos frescos
        await AsyncStorage.setItem('user', JSON.stringify(user));
        return;
      }
      
      // Fallback a datos locales si falla el API
      const userData = await AsyncStorage.getItem('user');
      console.log('[Dashboard] Fallback to local userData:', userData);
      
      if (userData) {
        const user = JSON.parse(userData) as User;
        
        const fullName = user.nombre_completo || user.nombre_usuario || 'Usuario';
        setUserName(fullName);
        
        const initial = fullName.charAt(0).toUpperCase();
        setUserInitial(initial);
        
        // Validar URL de imagen del fallback local
        const localProfilePic = user.profile_picture;
        if (localProfilePic && typeof localProfilePic === 'string' && localProfilePic.trim() !== '') {
          let cleanUrl = localProfilePic.trim();
          
          // Corregir URL duplicada de Cloudinary
          const cloudinaryUploadPattern = 'cloudinary.com/ducn8dj4o/image/upload/';
          const firstIndex = cleanUrl.indexOf(cloudinaryUploadPattern);
          const lastIndex = cleanUrl.lastIndexOf(cloudinaryUploadPattern);
          
          if (firstIndex !== -1 && lastIndex !== -1 && firstIndex !== lastIndex) {
            const correctPart = cleanUrl.substring(lastIndex);
            cleanUrl = 'https://res.' + correctPart;
            console.log('[Dashboard] 🔧 Fallback URL corregida:', cleanUrl);
          }
          
          const isValidUrl = cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://');
          if (isValidUrl) {
            console.log('[Dashboard] ✅ Fallback URL válida:', cleanUrl);
            setProfilePicture(cleanUrl);
            setImageLoadError(false);
          }
        }
        
        const id = user.id || (user as any).id_usuario;
        if (id) {
          setUserId(id);
        }
      }
    } catch (error) {
      console.error('Error al cargar datos del usuario:', error);
      setUserName('Usuario');
      setUserInitial('U');
    }
  };

  const fetchStats = async (id: number) => {
    try {
      console.log('[Dashboard] Fetching stats for user ID:', id);
      const response = await getReservasUsuario(id);
      console.log('[Dashboard] Response:', JSON.stringify(response, null, 2));
      
      if (response.success && response.data) {
        const reservas = response.data.reservas;
        console.log('[Dashboard] Total reservas:', reservas.length);
        console.log('[Dashboard] Estados de reservas:', reservas.map(r => r.estado));
        
        // Calcular estadísticas
        const pendientes = reservas.filter(r => r.estado === 'pendiente' || r.estado === 'confirmada' || r.estado === 'en_proceso');
        const completed = reservas.filter(r => r.estado === 'completado' || r.estado === 'completada').length;
        const cancelled = reservas.filter(r => (r as any).estado === 'cancelada' || (r as any).estado === 'cancelado').length;
        const expired = reservas.filter(r => r.estado === 'vencida').length;
        
        setPendingCount(pendientes.length);
        setCompletedCount(completed);
        setCancelledCount(cancelled);
        setExpiredCount(expired);
        
        // Encontrar la reserva más próxima
        // Priorizar reservas en estado pendiente/confirmada/en_proceso (pendientes)
        const now = Date.now();
        console.log('[Dashboard] Hora actual (now):', new Date(now).toISOString());
        
        const parseReservaDate = (r: any) => {
          try {
            console.log('[Dashboard] Parseando reserva:', { 
              id: r.id_reserva, 
              fecha: r.fecha, 
              hora: r.hora, 
              estado: r.estado 
            });
            
            // Extraer solo la fecha (YYYY-MM-DD)
            let fechaOnly: string;
            if (typeof r.fecha === 'string') {
              fechaOnly = r.fecha.split('T')[0];
            } else {
              fechaOnly = new Date(r.fecha).toISOString().split('T')[0];
            }
            
            // Extraer la hora (HH:MM)
            let horaStr = '12:00:00';
            if (r.hora) {
              horaStr = r.hora.toString();
            }
            
            // Parsear componentes de fecha y hora
            const [year, month, day] = fechaOnly.split('-').map(Number);
            const timeParts = horaStr.split(':').map(Number);
            const hours = timeParts[0] || 0;
            const minutes = timeParts[1] || 0;
            
            // Crear fecha usando componentes LOCALES (no UTC)
            // Esto asegura que 15:00 se interprete como 15:00 hora local
            const d = new Date(year, month - 1, day, hours, minutes, 0);
            
            console.log('[Dashboard] Fecha parseada (LOCAL):', { 
              fechaOnly,
              horaStr,
              parsedLocal: d.toString(),
              parsedUTC: d.toISOString(),
              timestamp: d.getTime(),
              esValida: !isNaN(d.getTime())
            });
            
            if (isNaN(d.getTime())) return null;
            return d;
          } catch (e) {
            console.error('[Dashboard] Error parseando fecha:', e);
            const d = new Date(r.fecha);
            return isNaN(d.getTime()) ? null : d;
          }
        };

        const buildWithDates = (list: any[]) => list
          .map(r => ({ reserva: r, date: parseReservaDate(r) }))
          .filter(x => x.date !== null) as { reserva: Reserva; date: Date }[];

        const pendientesList = reservas.filter((r: any) => ['pendiente', 'confirmada', 'en_proceso'].includes(r.estado));
        console.log('[Dashboard] Reservas pendientes encontradas:', pendientesList.length);

        // 1) Buscar próximas futuras dentro de pendientes
        let chosen: { reserva: Reserva; date: Date } | null = null;
        const pendientesWithDates = buildWithDates(pendientesList);
        console.log('[Dashboard] Pendientes con fechas válidas:', pendientesWithDates.length);
        
        // Log detallado de cada pendiente para debug
        console.log('[Dashboard] ⏰ Hora actual (now):', new Date(now).toString(), 'timestamp:', now);
        pendientesWithDates.forEach((x, i) => {
          const esFutura = x.date.getTime() >= now;
          const diff = x.date.getTime() - now;
          console.log(`[Dashboard] Reserva ${i + 1}:`, {
            id: x.reserva.id_reserva,
            numero: (x.reserva as any).numero_reserva,
            fechaLocal: x.date.toString(),
            timestamp: x.date.getTime(),
            esFutura,
            diferenciaMins: Math.round(diff / 60000)
          });
        });
        
        const futurasPendientes = pendientesWithDates
          .filter(x => x.date.getTime() >= now)
          .sort((a, b) => a.date.getTime() - b.date.getTime());
        console.log('[Dashboard] Pendientes futuras:', futurasPendientes.length);
        
        if (futurasPendientes.length > 0) {
          chosen = futurasPendientes[0];
          console.log('[Dashboard] Elegida (futura pendiente):', chosen.reserva.id_reserva);
        } else if (pendientesWithDates.length > 0) {
          // 2) Si no hay futuras pendientes, elegir la pendiente más cercana (pasada o futura)
          pendientesWithDates.sort((a, b) => Math.abs(a.date.getTime() - now) - Math.abs(b.date.getTime() - now));
          chosen = pendientesWithDates[0];
          console.log('[Dashboard] Elegida (pendiente más cercana):', chosen.reserva.id_reserva);
        } else {
          // 3) Si no hay pendientes, buscar en todas las reservas: primero futuras, luego la más cercana
          const allWithDates = buildWithDates(reservas);
          console.log('[Dashboard] Todas las reservas con fechas válidas:', allWithDates.length);
          
          const futurasAll = allWithDates
            .filter(x => x.date.getTime() >= now)
            .sort((a, b) => a.date.getTime() - b.date.getTime());
          console.log('[Dashboard] Todas las futuras:', futurasAll.length);
          
          if (futurasAll.length > 0) {
            chosen = futurasAll[0];
            console.log('[Dashboard] Elegida (futura cualquiera):', chosen.reserva.id_reserva);
          } else if (allWithDates.length > 0) {
            allWithDates.sort((a, b) => Math.abs(a.date.getTime() - now) - Math.abs(b.date.getTime() - now));
            chosen = allWithDates[0];
            console.log('[Dashboard] Elegida (más cercana cualquiera):', chosen.reserva.id_reserva);
          } else {
            chosen = null;
            console.log('[Dashboard] No se encontró ninguna reserva válida');
          }
        }

        if (chosen) {
          console.log('[Dashboard] ✅ Próxima cita seleccionada:', {
            id: chosen.reserva.id_reserva,
            fecha: chosen.reserva.fecha,
            hora: chosen.reserva.hora,
            estado: chosen.reserva.estado,
            empresa: chosen.reserva.nombre_empresa
          });
          setNextAppointment(chosen.reserva as Reserva);
        } else {
          console.log('[Dashboard] ⚠️ No hay próxima cita');
          setNextAppointment(null);
        }
      }
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setImageLoadError(false); // Resetear error de imagen al refrescar
    await loadUserData();
    await loadSuscripcion();
    if (userId) {
      await fetchStats(userId);
    }
    updateGreeting();
    setRefreshing(false);
  }, [userId]);

  const updateGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setCurrentTime('Buenos días');
    } else if (hour < 18) {
      setCurrentTime('Buenas tardes');
    } else {
      setCurrentTime('Buenas noches');
    }
  };

  const handleLogout = () => {
    AsyncStorage.removeItem('user');
    AsyncStorage.removeItem('token');
    router.replace('./');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.logo}
            contentFit="contain"
          />
          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={styles.profileImageButton}
              onPress={() => router.push('./client-profile')}
            >
              {profilePicture && !imageLoadError ? (
                <Image
                  source={{ uri: profilePicture }}
                  style={styles.profileImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={200}
                  onError={(e) => {
                    console.log('[Dashboard] ❌ Error cargando imagen:', e);
                    console.log('[Dashboard] URL que falló:', profilePicture);
                    setImageLoadError(true);
                  }}
                  onLoad={() => {
                    console.log('[Dashboard] ✅ Imagen cargada correctamente');
                    setImageLoadError(false);
                  }}
                />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <Text style={styles.profileInitial}>{userInitial}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.welcomeContainer}>
          <Text style={styles.userName}>{currentTime}, {userName}</Text>
          <Text style={styles.welcomeSubtitle}>¡Tu auto merece lo mejor!</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0C553C']} />
        }
      >
        {/* Stats Cards - Diseño compacto */}
        <View style={styles.statsContainer}>
          {/* Fila superior - 3 stats pequeños */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, styles.statCardPending]}>
              <View style={styles.statCardIcon}>
                <Ionicons name="time" size={18} color="#F59E0B" />
              </View>
              <View style={styles.statCardContent}>
                <Text style={styles.statCardNumber}>{pendingCount}</Text>
                <Text style={styles.statCardLabel}>Pendientes</Text>
              </View>
            </View>
            
            <View style={[styles.statCard, styles.statCardCompleted]}>
              <View style={styles.statCardIcon}>
                <Ionicons name="checkmark-circle" size={18} color="#10B981" />
              </View>
              <View style={styles.statCardContent}>
                <Text style={styles.statCardNumber}>{completedCount}</Text>
                <Text style={styles.statCardLabel}>Completadas</Text>
              </View>
            </View>
            
            <View style={[styles.statCard, styles.statCardCancelled]}>
              <View style={styles.statCardIcon}>
                <Ionicons name="close-circle" size={18} color="#EF4444" />
              </View>
              <View style={styles.statCardContent}>
                <Text style={styles.statCardNumber}>{cancelledCount}</Text>
                <Text style={styles.statCardLabel}>Canceladas</Text>
              </View>
            </View>

            <View style={[styles.statCard, styles.statCardExpired]}>
              <View style={styles.statCardIcon}>
                <Ionicons name="alert-circle" size={18} color="#6B7280" />
              </View>
              <View style={styles.statCardContent}>
                <Text style={styles.statCardNumber}>{expiredCount}</Text>
                <Text style={styles.statCardLabel}>Vencidas</Text>
              </View>
            </View>
          </View>
          
          {/* Próxima cita - Card especial */}
          <TouchableOpacity 
            style={styles.nextAppointmentCard}
            onPress={() => router.push('./my-appointments')}
            activeOpacity={0.8}
          >
            <View style={styles.nextAppointmentLeft}>
              <View style={styles.nextAppointmentIconBg}>
                <Ionicons name="calendar" size={20} color="#0C553C" />
              </View>
            </View>
            <View style={styles.nextAppointmentContent}>
              <Text style={styles.nextAppointmentTitle}>Próxima Cita</Text>
                  {nextAppointment ? (
                    <View style={styles.nextAppointmentInfoColumn}>
                      <View style={styles.nextAppointmentRow}>
                        <View style={styles.nextAppointmentDate}>
                          <Ionicons name="calendar-outline" size={14} color="#0C553C" />
                          <Text style={styles.nextAppointmentDateText}>
                            {new Date(nextAppointment.fecha.toString().split('T')[0] + 'T' + (nextAppointment.hora || '12:00').substring(0,5)).toLocaleDateString('es-ES', { 
                              weekday: 'short', 
                              day: 'numeric', 
                              month: 'short' 
                            })}
                          </Text>
                        </View>
                        <View style={styles.nextAppointmentTime}>
                          <Ionicons name="time-outline" size={14} color="#0C553C" />
                          <Text style={styles.nextAppointmentTimeText}>{(nextAppointment.hora || '').toString().substring(0,5)}</Text>
                        </View>
                      </View>
                      <View style={styles.nextAppointmentRowMeta}>
                        {nextAppointment.numero_reserva && (
                          <Text style={styles.nextAppointmentNumber}>Nº #{nextAppointment.numero_reserva}</Text>
                        )}
                        {nextAppointment.nombre_empresa && (
                          <Text style={styles.nextAppointmentCompany} numberOfLines={1}>{nextAppointment.nombre_empresa}</Text>
                        )}
                      </View>
                    </View>
                  ) : (
                    <Text style={styles.nextAppointmentEmpty}>No tienes citas programadas</Text>
                  )}
            </View>
            <View style={styles.nextAppointmentArrow}>
              <Ionicons name="chevron-forward" size={20} color="#0C553C" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Tarjeta de Mi Plan */}
        <TouchableOpacity 
          style={styles.planCard}
          onPress={() => router.push('./subscription-plans')}
          activeOpacity={0.8}
        >
          {miSuscripcion ? (
            <>
              <View style={styles.planCardLeft}>
                <View style={styles.planCardIconBg}>
                  <Ionicons name="ribbon" size={24} color="#F59E0B" />
                </View>
              </View>
              <View style={styles.planCardContent}>
                <View style={styles.planCardHeader}>
                  <Text style={styles.planCardTitle}>Mi Plan</Text>
                  <View style={styles.planActiveBadge}>
                    <Text style={styles.planActiveBadgeText}>Activo</Text>
                  </View>
                </View>
                <Text style={styles.planCardName}>{miSuscripcion.plan_nombre}</Text>
                <View style={styles.planCardStats}>
                  <View style={styles.planCardStat}>
                    <Ionicons name="car-sport" size={14} color="#0C553C" />
                    <Text style={styles.planCardStatText}>
                      {typeof miSuscripcion.servicios_restantes === 'string' 
                        ? 'Ilimitados' 
                        : `${miSuscripcion.servicios_restantes} disponibles`}
                    </Text>
                  </View>
                  <View style={styles.planCardStat}>
                    <Ionicons name="time" size={14} color="#0C553C" />
                    <Text style={styles.planCardStatText}>{miSuscripcion.dias_restantes} días</Text>
                  </View>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#0C553C" />
            </>
          ) : (
            <>
              <View style={styles.planCardLeft}>
                <View style={[styles.planCardIconBg, { backgroundColor: '#E8F5E9' }]}>
                  <Ionicons name="pricetags" size={24} color="#0C553C" />
                </View>
              </View>
              <View style={styles.planCardContent}>
                <Text style={styles.planCardTitle}>Planes de Suscripción</Text>
                <Text style={styles.planCardSubtitle}>¡Ahorra en cada lavado!</Text>
                <Text style={styles.planCardCta}>Ver planes disponibles →</Text>
              </View>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Servicios Disponibles</Text>
        
        <View style={styles.servicesGrid}>
          <TouchableOpacity 
            style={[styles.serviceCard, styles.primaryCard]} 
            onPress={() => router.push('./book-appointment')}
            activeOpacity={0.7}
          >
            <View style={[styles.serviceIconContainer, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Ionicons name="car-sport" size={28} color="#fff" />
            </View>
            <Text style={[styles.serviceTitle, { color: '#fff' }]}>Reservar Cita</Text>
            <Text style={[styles.serviceDescription, { color: '#fff', opacity: 0.95 }]}>
              Agenda tu próximo lavado
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.serviceCard}
            onPress={() => router.push('./my-appointments')}
            activeOpacity={0.7}
          >
            <View style={styles.serviceIconContainer}>
              <Ionicons name="calendar-outline" size={28} color="#0C553C" />
            </View>
            <Text style={styles.serviceTitle}>Mis Citas</Text>
            <Text style={styles.serviceDescription}>Ver y gestionar citas</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.serviceCard}
            onPress={() => router.push('./subscription-plans')}
            activeOpacity={0.7}
          >
            <View style={[styles.serviceIconContainer, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="ribbon" size={28} color="#F59E0B" />
            </View>
            <Text style={styles.serviceTitle}>Planes</Text>
            <Text style={styles.serviceDescription}>Suscripciones</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.serviceCard}
            onPress={() => router.push('./client-profile')}
            activeOpacity={0.7}
          >
            <View style={styles.serviceIconContainer}>
              <Ionicons name="person-outline" size={28} color="#0C553C" />
            </View>
            <Text style={styles.serviceTitle}>Mi Perfil</Text>
            <Text style={styles.serviceDescription}>Editar información</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.serviceCard}
            onPress={() => router.push('./client-support')}
            activeOpacity={0.7}
          >
            <View style={styles.serviceIconContainer}>
              <Ionicons name="chatbubble-ellipses-outline" size={28} color="#0C553C" />
            </View>
            <Text style={styles.serviceTitle}>Soporte</Text>
            <Text style={styles.serviceDescription}>Ayuda y contacto</Text>
          </TouchableOpacity>
        </View>

        {/* Tips de Cuidado */}
        <View style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <View style={styles.tipsIconBg}>
              <Ionicons name="bulb" size={22} color="#F59E0B" />
            </View>
            <View style={styles.tipsHeaderText}>
              <Text style={styles.tipsTitle}>¿Sabías que...?</Text>
              <Text style={styles.tipsSubtitle}>Tip del día</Text>
            </View>
          </View>
          <Text style={styles.tipsText}>
            Lavar tu auto regularmente no solo mejora su apariencia, sino que también protege la pintura de la corrosión y mantiene su valor de reventa. ¡Agenda tu próximo lavado!
          </Text>
          <View style={styles.tipsFooter}>
            <View style={styles.tipsTag}>
              <Ionicons name="car-sport" size={14} color="#0C553C" />
              <Text style={styles.tipsTagText}>Cuidado del vehículo</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#0C553C',
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileImageButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profileImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  logo: {
    width: 50,
    height: 50,
  },
  welcomeContainer: {
    alignItems: 'flex-start',
    width: '100%',
  },
  greetingTime: {
    fontSize: 16,
    color: '#B8E6D5',
    fontWeight: '500',
    marginBottom: 5,
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#B8E6D5',
    fontStyle: 'italic',
  },
  logoutButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
    marginTop: -15,
  },
  // ============================================
  // ESTILOS STATS COMPACTOS
  // ============================================
  statsContainer: {
    marginBottom: 20,
    marginTop: 5,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap', // Permitir wrap para multilínea
    gap: 12, // Espacio entre cards
    marginBottom: 12,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    width: '48%', // Aumentar ancho para 2 columnas
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 0, // El gap maneja el espaciado vertical también (en navegadores modernos/RN reciente) o necesitamos marginBottom explícito si gap no funciona en versión vieja de RN.
  },
  statCardPending: {
    borderTopWidth: 3,
    borderTopColor: '#F59E0B',
  },
  statCardCompleted: {
    borderTopWidth: 3,
    borderTopColor: '#10B981',
  },
  statCardCancelled: {
    borderTopWidth: 3,
    borderTopColor: '#EF4444',
  },
  statCardExpired: {
    borderTopWidth: 3,
    borderTopColor: '#6B7280', // Gris para vencidas
  },
  statCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  statCardContent: {
    flex: 1,
  },
  statCardNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  statCardLabel: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: 1,
  },
  // Próxima cita card
  nextAppointmentCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#0C553C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E8F5E9',
  },
  nextAppointmentLeft: {
    marginRight: 12,
  },
  nextAppointmentIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextAppointmentContent: {
    flex: 1,
  },
  nextAppointmentTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  nextAppointmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  nextAppointmentDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  nextAppointmentDateText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0C553C',
    textTransform: 'capitalize',
  },
  nextAppointmentTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  nextAppointmentTimeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0C553C',
  },
  nextAppointmentEmpty: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  nextAppointmentInfoColumn: {
    flexDirection: 'column',
    gap: 8,
  },
  nextAppointmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 12,
  },
  nextAppointmentRowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  nextAppointmentNumber: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },
  nextAppointmentCompany: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
  },
  nextAppointmentArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0C553C',
    marginBottom: 18,
    marginLeft: 5,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  serviceCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
    width: '48%',
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#E8F5E9',
  },
  primaryCard: {
    backgroundColor: '#0C553C',
    borderColor: '#0C553C',
  },
  serviceIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(12, 85, 60, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceIcon: {
    fontSize: 26,
  },
  serviceTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0C553C',
    marginBottom: 6,
    textAlign: 'center',
  },
  serviceDescription: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    lineHeight: 15,
  },
  // ============================================
  // ESTILOS TIPS CARD
  // ============================================
  tipsCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipsIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tipsHeaderText: {
    flex: 1,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
  },
  tipsSubtitle: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 1,
  },
  tipsText: {
    fontSize: 14,
    color: '#78350F',
    lineHeight: 21,
    marginBottom: 12,
  },
  tipsFooter: {
    flexDirection: 'row',
  },
  tipsTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
  },
  tipsTagText: {
    fontSize: 12,
    color: '#0C553C',
    fontWeight: '500',
  },
  // Estilos para la tarjeta del plan
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginHorizontal: 16,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#0C553C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#E8F5F0',
  },
  planCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  planCardIconBg: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  planCardContent: {
    flex: 1,
  },
  planCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  planCardTitle: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  planActiveBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  planActiveBadgeText: {
    fontSize: 10,
    color: '#16A34A',
    fontWeight: '600',
  },
  planCardName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  planCardStats: {
    flexDirection: 'row',
    gap: 12,
  },
  planCardStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  planCardStatText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  planCardSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  planCardCta: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F0FDF9',
    justifyContent: 'center',
    alignItems: 'center',
  },
});