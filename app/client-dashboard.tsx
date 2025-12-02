import { StyleSheet, View, Text, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getReservasUsuario, Reserva, User, getProfile } from '../services/api';
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
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    loadUserData();
    updateGreeting();
  }, []);

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
        
        // Cargar foto de perfil
        if (user.profile_picture) {
          setProfilePicture(user.profile_picture);
        } else {
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
        
        if (user.profile_picture) {
          setProfilePicture(user.profile_picture);
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
        
        // Calcular estadísticas - usar 'completado' según el modelo Django
        const pending = reservas.filter(r => r.estado === 'pendiente' || r.estado === 'confirmada' || r.estado === 'en_proceso').length;
        const completed = reservas.filter(r => r.estado === 'completado' || r.estado === 'completada').length;
        
        console.log('[Dashboard] Pending count:', pending);
        console.log('[Dashboard] Completed count:', completed);
        
        setPendingCount(pending);
        setCompletedCount(completed);
      }
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadUserData();
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
              {profilePicture ? (
                <Image
                  source={{ uri: profilePicture }}
                  style={styles.profileImage}
                  contentFit="cover"
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
        <View style={styles.quickStats}>
          <View style={[styles.statItem, styles.statItemPending]}>
            <View style={styles.statIconContainer}>
              <Ionicons name="time-outline" size={24} color="#FF9800" />
            </View>
            <Text style={styles.statNumber}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Citas Pendientes</Text>
          </View>
          <View style={[styles.statItem, styles.statItemCompleted]}>
            <View style={styles.statIconContainer}>
              <Ionicons name="checkmark-circle-outline" size={24} color="#4CAF50" />
            </View>
            <Text style={styles.statNumber}>{completedCount}</Text>
            <Text style={styles.statLabel}>Lavados Realizados</Text>
          </View>
        </View>

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

        <View style={styles.promotionCard}>
          <View style={styles.promotionHeader}>
            <View style={styles.promotionIconContainer}>
              <Ionicons name="gift-outline" size={24} color="#0C553C" />
            </View>
            <Text style={styles.promotionTitle}>Oferta Especial</Text>
          </View>
          <Text style={styles.promotionText}>
            ¡Lavado completo + encerado por solo $25,000! Válido hasta fin de mes.
          </Text>
          <TouchableOpacity 
            style={styles.promotionButton}
            onPress={() => router.push('./book-appointment')}
            activeOpacity={0.8}
          >
            <Text style={styles.promotionButtonText}>¡Reservar Ahora!</Text>
          </TouchableOpacity>
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
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
    marginTop: 5,
  },
  statItem: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    width: '48%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 6,
  },
  statItemPending: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  statItemCompleted: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F9F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statIcon: {
    fontSize: 20,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0C553C',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
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
  promotionCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
    marginTop: 10,
    borderLeftWidth: 5,
    borderLeftColor: '#0C553C',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 6,
  },
  promotionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  promotionIconContainer: {
    marginRight: 8,
  },
  promotionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0C553C',
  },
  promotionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    marginBottom: 16,
  },
  promotionButton: {
    backgroundColor: '#0C553C',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignSelf: 'flex-start',
    shadowColor: '#0C553C',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  promotionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});