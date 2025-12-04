import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Cargando dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Premium con Gradiente */}
      <LinearGradient
        colors={['#FF6B35', '#FF8E53', '#FFB347']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        {/* Decoración de fondo */}
        <View style={styles.headerDecoration}>
          <View style={styles.decorCircle1} />
          <View style={styles.decorCircle2} />
          <View style={styles.decorCircle3} />
        </View>

        {/* Contenido del Header */}
        <View style={styles.headerContent}>
          {/* Fila superior: Logo y botón salir */}
          <View style={styles.headerTopRow}>
            <View style={styles.brandContainer}>
              <View style={styles.logoContainer}>
                <Ionicons name="car-sport" size={18} color="#FF6B35" />
              </View>
              <Text style={styles.brandText}>AutoNew</Text>
              <View style={styles.proBadge}>
                <Ionicons name="shield-checkmark" size={10} color="#FFD700" />
                <Text style={styles.proBadgeText}>PRO</Text>
              </View>
            </View>
            
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={18} color="#E53935" />
              <Text style={styles.logoutText}>Salir</Text>
            </TouchableOpacity>
          </View>

          {/* Perfil de la Empresa */}
          <View style={styles.profileSection}>
            <View style={styles.profileImageWrapper}>
              {empresa?.profile_image ? (
                <Image
                  source={{ uri: empresa.profile_image }}
                  style={styles.profileImage}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <Ionicons name="business" size={32} color="#FF6B35" />
                </View>
              )}
              <View style={styles.onlineIndicator} />
            </View>
            
            <View style={styles.profileInfo}>
              <Text style={styles.greeting}>¡Bienvenido de vuelta!</Text>
              <Text style={styles.companyName}>
                {empresa?.nombre_empresa || 'Mi Empresa'}
              </Text>
              <View style={styles.roleBadge}>
                <Ionicons name="briefcase" size={12} color="#FF6B35" />
                <Text style={styles.roleText}>Panel de Administración</Text>
              </View>
            </View>
          </View>

          {/* Estadísticas Rápidas en Header */}
          <View style={styles.quickStatsRow}>
            <View style={styles.quickStatItem}>
              <View style={[styles.quickStatIcon, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
                <Ionicons name="calendar" size={16} color="#3B82F6" />
              </View>
              <View>
                <Text style={styles.quickStatValue}>{stats.citasHoy}</Text>
                <Text style={styles.quickStatLabel}>Citas hoy</Text>
              </View>
            </View>
            
            <View style={styles.quickStatDivider} />
            
            <View style={styles.quickStatItem}>
              <View style={[styles.quickStatIcon, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
                <Ionicons name="cash" size={16} color="#10B981" />
              </View>
              <View>
                <Text style={styles.quickStatValue}>{formatCurrency(stats.ingresosHoy)}</Text>
                <Text style={styles.quickStatLabel}>Ingresos hoy</Text>
              </View>
            </View>
            
            <View style={styles.quickStatDivider} />
            
            <View style={styles.quickStatItem}>
              <View style={[styles.quickStatIcon, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
                <Ionicons name="star" size={16} color="#F59E0B" />
              </View>
              <View>
                <Text style={styles.quickStatValue}>{stats.satisfaccion}%</Text>
                <Text style={styles.quickStatLabel}>Satisfacción</Text>
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF6B35']} />
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

        {/* Panel de Control Compacto */}
        <View style={styles.panelControlContainer}>
          <View style={styles.panelHeader}>
            <View style={styles.panelTitleRow}>
              <View style={styles.panelIconBadge}>
                <Ionicons name="grid" size={16} color="#FF6B35" />
              </View>
              <Text style={styles.panelTitle}>Panel de Control</Text>
            </View>
          </View>
          
          {/* Stats Grid Compacto */}
          <View style={styles.statsGrid}>
            <View style={styles.statMiniCard}>
              <View style={[styles.statMiniIcon, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="calendar" size={16} color="#3B82F6" />
              </View>
              <Text style={styles.statMiniNumber}>{stats.citasHoy}</Text>
              <Text style={styles.statMiniLabel}>Citas Hoy</Text>
            </View>
            
            <View style={styles.statMiniCard}>
              <View style={[styles.statMiniIcon, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="cash" size={16} color="#10B981" />
              </View>
              <Text style={styles.statMiniNumber}>{formatCurrency(stats.ingresosHoy)}</Text>
              <Text style={styles.statMiniLabel}>Ingresos Hoy</Text>
            </View>
            
            <View style={styles.statMiniCard}>
              <View style={[styles.statMiniIcon, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="people" size={16} color="#F59E0B" />
              </View>
              <Text style={styles.statMiniNumber}>{stats.clientesActivos}</Text>
              <Text style={styles.statMiniLabel}>Clientes</Text>
            </View>
            
            <View style={styles.statMiniCard}>
              <View style={[styles.statMiniIcon, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="heart" size={16} color="#EF4444" />
              </View>
              <Text style={styles.statMiniNumber}>{stats.satisfaccion}%</Text>
              <Text style={styles.statMiniLabel}>Satisfacción</Text>
            </View>
          </View>

          {/* Resumen del Mes Compacto */}
          <View style={styles.monthlyCompact}>
            <View style={styles.monthlyCompactHeader}>
              <Ionicons name="trending-up" size={14} color="#FF6B35" />
              <Text style={styles.monthlyCompactTitle}>Resumen del Mes</Text>
            </View>
            <View style={styles.monthlyCompactRow}>
              <View style={styles.monthlyCompactItem}>
                <Text style={styles.monthlyCompactValue}>{stats.reservasMes}</Text>
                <Text style={styles.monthlyCompactLabel}>Reservas</Text>
              </View>
              <View style={styles.monthlyCompactDivider} />
              <View style={styles.monthlyCompactItem}>
                <Text style={styles.monthlyCompactValue}>{formatCurrency(stats.ingresosMes)}</Text>
                <Text style={styles.monthlyCompactLabel}>Ingresos</Text>
              </View>
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
              <Ionicons name="document-text-outline" size={28} color="#FF6B35" />
            </View>
            <Text style={styles.serviceTitle}>Reservas</Text>
            <Text style={styles.serviceDescription}>Gestionar citas y horarios</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.serviceCard} onPress={() => router.push('./company-services')}>
            <View style={styles.serviceIconContainer}>
              <Ionicons name="water-outline" size={28} color="#FF6B35" />
            </View>
            <Text style={styles.serviceTitle}>Servicios</Text>
            <Text style={styles.serviceDescription}>Mis servicios y solicitudes</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.serviceCard} onPress={() => router.push('./company-profile')}>
            <View style={styles.serviceIconContainer}>
              <Ionicons name="business-outline" size={28} color="#FF6B35" />
            </View>
            <Text style={styles.serviceTitle}>Mi Perfil</Text>
            <Text style={styles.serviceDescription}>Datos y configuración</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.serviceCard} onPress={() => router.push('./company-payments')}>
            <View style={styles.serviceIconContainer}>
              <Ionicons name="cash-outline" size={28} color="#FF6B35" />
            </View>
            <Text style={styles.serviceTitle}>Mis Pagos</Text>
            <Text style={styles.serviceDescription}>Pagos y liquidaciones</Text>
          </TouchableOpacity>
        </View>

        {/* Próximas citas del día */}
        {stats.proximasCitas && stats.proximasCitas.length > 0 && (
          <View style={styles.upcomingContainer}>
            <View style={styles.upcomingTitleRow}>
              <Ionicons name="time-outline" size={20} color="#FF6B35" />
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
              <Ionicons name="qr-code-outline" size={20} color="#FF6B35" />
            </View>
            <Text style={styles.quickActionText}>Escanear QR de Reserva</Text>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => router.push('./company-payments')}
          >
            <View style={styles.quickActionIconContainer}>
              <Ionicons name="cash-outline" size={20} color="#FF6B35" />
            </View>
            <Text style={styles.quickActionText}>Ver Mis Pagos</Text>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => router.push('./company-analytics')}
          >
            <View style={styles.quickActionIconContainer}>
              <Ionicons name="bar-chart-outline" size={20} color="#FF6B35" />
            </View>
            <Text style={styles.quickActionText}>Ver Estadísticas</Text>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => router.push('./company-services')}
          >
            <View style={styles.quickActionIconContainer}>
              <Ionicons name="add-circle-outline" size={20} color="#FF6B35" />
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
    backgroundColor: '#FF6B35',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  retryText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  headerDecoration: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  decorCircle1: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  decorCircle2: {
    position: 'absolute',
    top: 80,
    right: 60,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  decorCircle3: {
    position: 'absolute',
    bottom: -30,
    left: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  headerContent: {
    zIndex: 1,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  brandText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.5)',
  },
  proBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
  },
  logoutText: {
    color: '#E53935',
    fontSize: 13,
    fontWeight: '600',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileImageWrapper: {
    position: 'relative',
  },
  profileImage: {
    width: 70,
    height: 70,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  profileImagePlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10B981',
    borderWidth: 3,
    borderColor: '#FF6B35',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  greeting: {
    fontSize: 13,
    color: '#FFFFFF',
    marginBottom: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  companyName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 5,
  },
  roleText: {
    fontSize: 11,
    color: '#FF6B35',
    fontWeight: '600',
  },
  quickStatsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  quickStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickStatIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  quickStatLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 1,
  },
  quickStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
    marginTop: 8,
  },
  // Panel de Control Compacto
  panelControlContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  panelHeader: {
    marginBottom: 12,
  },
  panelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  panelIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  panelTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  // Stats Grid Compacto
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  statMiniCard: {
    width: '48%',
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  statMiniIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statMiniNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  statMiniLabel: {
    fontSize: 10,
    color: '#888',
    marginTop: 2,
    fontWeight: '500',
  },
  // Resumen Mensual Compacto
  monthlyCompact: {
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    borderRadius: 12,
    padding: 12,
  },
  monthlyCompactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  monthlyCompactTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF6B35',
  },
  monthlyCompactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthlyCompactItem: {
    flex: 1,
    alignItems: 'center',
  },
  monthlyCompactValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF6B35',
  },
  monthlyCompactLabel: {
    fontSize: 10,
    color: '#FF6B35',
    opacity: 0.7,
    marginTop: 2,
  },
  monthlyCompactDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
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
    backgroundColor: '#FF6B35',
  },
  serviceIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
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
    color: '#FF6B35',
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
    color: '#FF6B35',
  },
  citaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  citaHora: {
    backgroundColor: '#FF6B35',
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
    color: '#FF6B35',
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
    borderLeftColor: '#FF6B35',
  },
  quickActionIconContainer: {
    marginRight: 10,
  },
  quickActionIcon: {
    fontSize: 20,
    marginRight: 10,
    color: '#FF6B35',
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