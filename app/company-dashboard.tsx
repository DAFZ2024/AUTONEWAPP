import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { getDashboardStats, logoutEmpresa, getEmpresa, DashboardStats, Empresa } from '@/services/api';

export default function CompanyDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    citasHoy: 0,
    ingresosHoy: 0,
    clientesActivos: 0,
    satisfaccion: 0,
    citasPendientes: 0,
    ingresosMes: 0,
    reservasMes: 0,
    proximasCitas: []
  });

  const fetchData = async () => {
    try {
      setError(null);
      
      // Obtener datos de la empresa
      const empresaData = await getEmpresa();
      if (empresaData) {
        setEmpresa(empresaData);
      }

      // Obtener estadísticas del dashboard
      const response = await getDashboardStats();
      
      if (response.success && response.data) {
        setStats(response.data);
      } else {
        setError(response.message || 'Error al cargar estadísticas');
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Error de conexión con el servidor');
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

  const handleLogout = async () => {
    await logoutEmpresa();
    router.replace('./');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0C553C" />
        <Text style={styles.loadingText}>Cargando dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          {empresa?.profile_image ? (
            <Image
              source={{ uri: empresa.profile_image }}
              style={styles.profileImage}
              contentFit="cover"
            />
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <Ionicons name="business" size={30} color="#fff" />
            </View>
          )}
          <View style={styles.headerInfo}>
            <Text style={styles.welcome}>
              {empresa?.nombre_empresa || 'Mi Empresa'}
            </Text>
            <Text style={styles.headerSubtitle}>Panel de Administración</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color="#fff" />
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0C553C']} />
        }
      >
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={20} color="#856404" style={styles.errorIcon} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
              <Text style={styles.retryText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.sectionTitle}>Panel de Control</Text>
        
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.citasHoy}</Text>
            <Text style={styles.statLabel}>Citas Hoy</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{formatCurrency(stats.ingresosHoy)}</Text>
            <Text style={styles.statLabel}>Ingresos Hoy</Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.clientesActivos}</Text>
            <Text style={styles.statLabel}>Clientes Activos</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.satisfaccion}%</Text>
            <Text style={styles.statLabel}>Satisfacción</Text>
          </View>
        </View>

        {/* Estadísticas del mes */}
        <View style={styles.monthlyStatsContainer}>
          <View style={styles.monthlyTitleRow}>
            <Ionicons name="calendar-outline" size={20} color="#0C553C" />
            <Text style={styles.monthlyTitle}>Resumen del Mes</Text>
          </View>
          <View style={styles.monthlyRow}>
            <View style={styles.monthlyItem}>
              <Text style={styles.monthlyNumber}>{stats.reservasMes}</Text>
              <Text style={styles.monthlyLabel}>Reservas</Text>
            </View>
            <View style={styles.monthlyDivider} />
            <View style={styles.monthlyItem}>
              <Text style={styles.monthlyNumber}>{formatCurrency(stats.ingresosMes)}</Text>
              <Text style={styles.monthlyLabel}>Ingresos</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Gestión del Autolavado</Text>
        
        <View style={styles.servicesGrid}>
          <TouchableOpacity style={[styles.serviceCard, styles.primaryCard]} onPress={() => router.push('./company-analytics')}>
            <View style={styles.serviceIconContainer}>
              <Ionicons name="stats-chart-outline" size={28} color="#fff" />
            </View>
            <Text style={[styles.serviceTitle, { color: '#fff' }]}>Analíticas</Text>
            <Text style={[styles.serviceDescription, { color: '#fff', opacity: 0.9 }]}>Ventas, clientes y rendimiento</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.serviceCard} onPress={() => router.push('./company-reservations')}>
            <View style={styles.serviceIconContainer}>
              <Ionicons name="document-text-outline" size={28} color="#0C553C" />
            </View>
            <Text style={styles.serviceTitle}>Reservas</Text>
            <Text style={styles.serviceDescription}>Gestionar citas y horarios</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.serviceCard} onPress={() => router.push('./company-services')}>
            <View style={styles.serviceIconContainer}>
              <Ionicons name="water-outline" size={28} color="#0C553C" />
            </View>
            <Text style={styles.serviceTitle}>Servicios</Text>
            <Text style={styles.serviceDescription}>Mis servicios y solicitudes</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.serviceCard} onPress={() => router.push('./company-profile')}>
            <View style={styles.serviceIconContainer}>
              <Ionicons name="business-outline" size={28} color="#0C553C" />
            </View>
            <Text style={styles.serviceTitle}>Mi Perfil</Text>
            <Text style={styles.serviceDescription}>Datos y configuración</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.serviceCard} onPress={() => router.push('./company-payments')}>
            <View style={styles.serviceIconContainer}>
              <Ionicons name="cash-outline" size={28} color="#0C553C" />
            </View>
            <Text style={styles.serviceTitle}>Mis Pagos</Text>
            <Text style={styles.serviceDescription}>Pagos y liquidaciones</Text>
          </TouchableOpacity>
        </View>

        {/* Próximas citas del día */}
        {stats.proximasCitas && stats.proximasCitas.length > 0 && (
          <View style={styles.upcomingContainer}>
            <View style={styles.upcomingTitleRow}>
              <Ionicons name="time-outline" size={20} color="#0C553C" />
              <Text style={styles.upcomingTitle}>Próximas Citas de Hoy</Text>
            </View>
            {stats.proximasCitas.map((cita: any, index: number) => (
              <View key={cita.id_reserva || index} style={styles.citaItem}>
                <View style={styles.citaHora}>
                  <Text style={styles.citaHoraText}>
                    {cita.hora?.substring(0, 5) || '--:--'}
                  </Text>
                </View>
                <View style={styles.citaInfo}>
                  <Text style={styles.citaCliente}>{cita.nombre_cliente || 'Cliente'}</Text>
                  <Text style={styles.citaServicios}>
                    {cita.servicios?.map((s: any) => s.nombre_servicio).join(', ') || 'Sin servicios'}
                  </Text>
                  {cita.placa_vehiculo && (
                    <View style={styles.citaPlacaRow}>
                      <Ionicons name="car-outline" size={12} color="#888" />
                      <Text style={styles.citaPlaca}>{cita.placa_vehiculo}</Text>
                    </View>
                  )}
                </View>
                <View style={[styles.citaEstado, { backgroundColor: cita.estado === 'pendiente' ? '#ffc107' : '#28a745' }]}>
                  <Ionicons 
                    name={cita.estado === 'pendiente' ? 'hourglass-outline' : 'checkmark'} 
                    size={16} 
                    color="#fff" 
                  />
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.quickActionsContainer}>
          <Text style={styles.quickActionsTitle}>Acciones Rápidas</Text>
          
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => router.push('./company-reservations')}
          >
            <View style={styles.quickActionIconContainer}>
              <Ionicons name="qr-code-outline" size={20} color="#0C553C" />
            </View>
            <Text style={styles.quickActionText}>Escanear QR de Reserva</Text>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => router.push('./company-payments')}
          >
            <View style={styles.quickActionIconContainer}>
              <Ionicons name="cash-outline" size={20} color="#0C553C" />
            </View>
            <Text style={styles.quickActionText}>Ver Mis Pagos</Text>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => router.push('./company-analytics')}
          >
            <View style={styles.quickActionIconContainer}>
              <Ionicons name="bar-chart-outline" size={20} color="#0C553C" />
            </View>
            <Text style={styles.quickActionText}>Ver Estadísticas</Text>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => router.push('./company-services')}
          >
            <View style={styles.quickActionIconContainer}>
              <Ionicons name="add-circle-outline" size={20} color="#0C553C" />
            </View>
            <Text style={styles.quickActionText}>Solicitar Nuevo Servicio</Text>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>
        </View>

        {stats.citasPendientes > 0 && (
          <View style={styles.alertsContainer}>
            <View style={styles.alertsTitleRow}>
              <Ionicons name="warning-outline" size={18} color="#856404" />
              <Text style={styles.alertsTitle}>Alertas del Día</Text>
            </View>
            
            <View style={styles.alertItem}>
              <Ionicons name="ellipse" size={6} color="#856404" style={styles.alertBullet} />
              <Text style={styles.alertText}>{stats.citasPendientes} citas pendientes por confirmar</Text>
            </View>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorIcon: {
    marginRight: 10,
  },
  errorText: {
    color: '#856404',
    flex: 1,
  },
  retryButton: {
    backgroundColor: '#0C553C',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  retryText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  header: {
    backgroundColor: '#0C553C',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 15,
  },
  welcome: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  logoutText: {
    color: '#fff',
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: '48%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0C553C',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  monthlyStatsContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  monthlyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    gap: 8,
  },
  monthlyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0C553C',
  },
  monthlyRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  monthlyItem: {
    alignItems: 'center',
    flex: 1,
  },
  monthlyNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  monthlyLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  monthlyDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#ddd',
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  serviceCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    width: '48%',
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  primaryCard: {
    backgroundColor: '#0C553C',
  },
  serviceIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(12, 85, 60, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  serviceIcon: {
    fontSize: 25,
    marginBottom: 8,
  },
  serviceTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0C553C',
    marginBottom: 3,
    textAlign: 'center',
  },
  serviceDescription: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  upcomingContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginTop: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  upcomingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 15,
  },
  upcomingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0C553C',
  },
  citaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  citaHora: {
    backgroundColor: '#0C553C',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 12,
  },
  citaHoraText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  citaInfo: {
    flex: 1,
  },
  citaCliente: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  citaServicios: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  citaPlaca: {
    fontSize: 12,
    color: '#888',
    marginLeft: 4,
  },
  citaPlacaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  citaEstado: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  citaEstadoText: {
    fontSize: 14,
  },
  quickActionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0C553C',
    marginBottom: 15,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#0C553C',
  },
  quickActionIconContainer: {
    marginRight: 10,
  },
  quickActionIcon: {
    fontSize: 20,
    marginRight: 10,
    color: '#0C553C',
    fontWeight: 'bold',
  },
  quickActionText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  alertsContainer: {
    backgroundColor: '#fff3cd',
    borderRadius: 15,
    padding: 20,
    marginTop: 20,
    borderLeftWidth: 5,
    borderLeftColor: '#ffc107',
    marginBottom: 20,
  },
  alertsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  alertsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertBullet: {
    marginRight: 8,
  },
  alertText: {
    fontSize: 14,
    color: '#856404',
  },
});