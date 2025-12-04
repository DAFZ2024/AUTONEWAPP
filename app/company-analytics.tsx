import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getAnaliticas, Analiticas } from '@/services/api';

const { width } = Dimensions.get('window');

export default function CompanyAnalytics() {
  const router = useRouter();
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Analiticas | null>(null);

  const fetchAnaliticas = async () => {
    try {
      setError(null);
      const response = await getAnaliticas(period);
      
      if (response.success && response.data) {
        setData(response.data);
      } else {
        setError(response.message || 'Error al cargar analíticas');
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchAnaliticas();
  }, [period]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAnaliticas();
  }, [period]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatCurrencyShort = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}k`;
    }
    return `$${amount}`;
  };

  // Generar datos para gráfico de barras (ingresos mensuales)
  const getMonthlyData = () => {
    if (!data?.ingresosMensuales || data.ingresosMensuales.length === 0) {
      // Devolver últimos 6 meses con valores en 0
      const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
      return meses.map(mes => ({ label: mes, value: 0 }));
    }
    return data.ingresosMensuales.map(item => ({
      label: item.mes.substring(0, 3),
      value: parseFloat(item.ingresos.toString()) || 0
    }));
  };

  // Generar datos para gráfico de líneas (reservas diarias)
  const getDailyData = () => {
    const diasSemana = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    if (!data?.reservasDiarias || data.reservasDiarias.length === 0) {
      return diasSemana.map((d) => ({ label: d, value: 0 }));
    }
    
    // Llenar los 7 días
    const today = new Date();
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const found = data.reservasDiarias.find(r => r.fecha.split('T')[0] === dateStr);
      const dayIndex = date.getDay();
      const dayLabel = ['D', 'L', 'M', 'X', 'J', 'V', 'S'][dayIndex];
      result.push({
        label: dayLabel,
        value: found ? parseInt(found.cantidad.toString()) : 0
      });
    }
    return result;
  };

  const renderBarChart = (chartData: { label: string; value: number }[]) => {
    const maxValue = Math.max(...chartData.map(d => d.value), 1);
    
    return (
      <View style={styles.chartContainer}>
        {chartData.map((item, index) => {
          const percentage = (item.value / maxValue) * 100;
          return (
            <View key={index} style={styles.barGroup}>
              <Text style={styles.barValue}>{formatCurrencyShort(item.value)}</Text>
              <View style={styles.bar}>
                <View style={[styles.barFill, { height: `${Math.max(percentage, 2)}%` }]}>
                  <View style={styles.barGradient} />
                </View>
              </View>
              <Text style={styles.barLabel}>{item.label}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  const renderLineChart = (chartData: { label: string; value: number }[]) => {
    const maxValue = Math.max(...chartData.map(d => d.value), 1);
    
    return (
      <View style={styles.lineChartWrapper}>
        <View style={styles.lineChartContainer}>
          {chartData.map((item, index) => {
            const percentage = (item.value / maxValue) * 100;
            return (
              <View key={index} style={styles.linePoint}>
                <Text style={styles.lineValue}>{item.value}</Text>
                <View style={[styles.lineDot, { bottom: `${Math.max(percentage, 5)}%` }]}>
                  <View style={styles.dotInner} />
                </View>
                {index < chartData.length - 1 && (
                  <View
                    style={[
                      styles.lineSegment,
                      {
                        width: (width - 100) / chartData.length,
                        bottom: `${Math.max(percentage, 5)}%`,
                      },
                    ]}
                  />
                )}
              </View>
            );
          })}
        </View>
        <View style={styles.lineLabels}>
          {chartData.map((item, index) => (
            <Text key={index} style={styles.lineLabel}>{item.label}</Text>
          ))}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Cargando analíticas...</Text>
      </View>
    );
  }

  const monthlyData = getMonthlyData();
  const dailyData = getDailyData();

  return (
    <ScrollView 
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF6B35']} />
      }
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('./company-dashboard')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={18} color="#fff" />
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Analíticas</Text>
        <View style={styles.headerSpacer} />
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={20} color="#856404" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchAnaliticas}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.periodSelector}>
        {(['week', 'month', 'year'] as const).map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.periodBtn, period === p && styles.periodActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
              {p === 'week' ? 'Semana' : p === 'month' ? 'Mes' : 'Año'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={styles.statIcon}>
            <Ionicons name="bar-chart-outline" size={24} color="#FF6B35" />
          </View>
          <Text style={styles.statValue}>{data?.totalReservas || 0}</Text>
          <Text style={styles.statLabel}>Reservas Totales</Text>
        </View>
        <View style={styles.statCard}>
          <View style={styles.statIcon}>
            <Ionicons name="cash-outline" size={24} color="#FF6B35" />
          </View>
          <Text style={styles.statValue}>{formatCurrencyShort(data?.ingresosTotales || 0)}</Text>
          <Text style={styles.statLabel}>Ingresos Totales</Text>
        </View>
        <View style={styles.statCard}>
          <View style={styles.statIcon}>
            <Ionicons name="checkmark-circle-outline" size={24} color="#FF6B35" />
          </View>
          <Text style={styles.statValue}>{data?.completadas || 0}</Text>
          <Text style={styles.statLabel}>Completadas</Text>
        </View>
        <View style={styles.statCard}>
          <View style={styles.statIcon}>
            <Ionicons name="trending-up-outline" size={24} color="#FF6B35" />
          </View>
          <Text style={styles.statValue}>{data?.tasaExito || 0}%</Text>
          <Text style={styles.statLabel}>Tasa de Éxito</Text>
        </View>
      </View>

      <View style={styles.chartSection}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="wallet-outline" size={20} color="#FF6B35" />
            <Text style={styles.sectionTitle}>Ingresos Mensuales</Text>
          </View>
          <Text style={styles.sectionSubtitle}>Últimos 6 meses</Text>
        </View>
        {renderBarChart(monthlyData)}
      </View>

      <View style={styles.chartSection}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="calendar-outline" size={20} color="#FF6B35" />
            <Text style={styles.sectionTitle}>Reservas Diarias</Text>
          </View>
          <Text style={styles.sectionSubtitle}>Esta semana</Text>
        </View>
        {renderLineChart(dailyData)}
      </View>

      <View style={styles.servicesSection}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="star-outline" size={20} color="#FF6B35" />
            <Text style={styles.sectionTitle}>Servicios Más Populares</Text>
          </View>
          <Text style={styles.sectionSubtitle}>Top 4 del período</Text>
        </View>
        {data?.serviciosPopulares && data.serviciosPopulares.length > 0 ? (
          data.serviciosPopulares.map((service, index) => (
            <View key={index} style={styles.serviceRow}>
              <View style={styles.serviceRank}>
                <Text style={styles.rankNumber}>{index + 1}</Text>
              </View>
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{service.nombre_servicio}</Text>
                <Text style={styles.serviceCount}>{service.cantidad} reservas</Text>
              </View>
              <View style={styles.serviceRevenueContainer}>
                <Text style={styles.serviceRevenue}>{formatCurrency(parseFloat(service.ingresos_total.toString()))}</Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="analytics-outline" size={40} color="#ccc" />
            <Text style={styles.emptyText}>No hay datos de servicios</Text>
          </View>
        )}
      </View>

      <View style={styles.summarySection}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="document-text-outline" size={20} color="#FF6B35" />
          <Text style={styles.sectionTitle}>Resumen Ejecutivo</Text>
        </View>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryLabelRow}>
              <Ionicons name="ellipse" size={6} color="#FF6B35" />
              <Text style={styles.summaryLabel}>Total de reservas:</Text>
            </View>
            <Text style={styles.summaryValue}>{data?.totalReservas || 0}</Text>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryLabelRow}>
              <Ionicons name="ellipse" size={6} color="#FF6B35" />
              <Text style={styles.summaryLabel}>Ingresos generados:</Text>
            </View>
            <Text style={styles.summaryValue}>{formatCurrency(data?.ingresosTotales || 0)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryLabelRow}>
              <Ionicons name="ellipse" size={6} color="#FF6B35" />
              <Text style={styles.summaryLabel}>Tasa de cancelación:</Text>
            </View>
            <Text style={styles.summaryValue}>{data?.tasaCancelacion || 0}%</Text>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryLabelRow}>
              <Ionicons name="ellipse" size={6} color="#FF6B35" />
              <Text style={styles.summaryLabel}>Servicio más popular:</Text>
            </View>
            <Text style={styles.summaryValue}>
              {data?.serviciosPopulares?.[0]?.nombre_servicio || 'N/A'}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryLabelRow}>
              <Ionicons name="ellipse" size={6} color="#FF6B35" />
              <Text style={styles.summaryLabel}>Reservas pendientes:</Text>
            </View>
            <Text style={styles.summaryValue}>{data?.pendientes || 0}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flexGrow: 1, 
    backgroundColor: '#F0F4F3', 
    paddingBottom: 40 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F4F3',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    backgroundColor: '#fff3cd',
    padding: 15,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  errorText: {
    color: '#856404',
    flex: 1,
  },
  retryButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  header: { 
    backgroundColor: '#FF6B35', 
    paddingTop: 50, 
    paddingBottom: 20, 
    flexDirection: 'row', 
    alignItems: 'center',
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
  },
  backButton: { 
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)', 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  backButtonText: { 
    color: '#fff', 
    fontWeight: '700',
    fontSize: 15,
  },
  title: { 
    color: '#fff', 
    fontSize: 22, 
    fontWeight: 'bold', 
    flex: 1, 
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  headerSpacer: {
    width: 85,
  },
  
  // Period Selector
  periodSelector: { 
    flexDirection: 'row', 
    margin: 20, 
    marginBottom: 16,
    backgroundColor: '#fff', 
    borderRadius: 14, 
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  periodBtn: { 
    flex: 1, 
    paddingVertical: 10, 
    alignItems: 'center', 
    borderRadius: 10,
    marginHorizontal: 2,
  },
  periodActive: { 
    backgroundColor: '#FF6B35',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  periodText: { 
    fontSize: 14, 
    color: '#666',
    fontWeight: '500',
  },
  periodTextActive: { 
    color: '#fff', 
    fontWeight: '700',
  },

  // Stats Grid
  statsGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  statCard: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 16, 
    width: '48%', 
    margin: '1%', 
    alignItems: 'center', 
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 3 }, 
    shadowOpacity: 0.12, 
    shadowRadius: 8, 
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#FF6B35',
    marginTop: 4,
  },
  statLabel: { 
    fontSize: 11, 
    color: '#666', 
    marginTop: 6,
    textAlign: 'center',
    fontWeight: '500',
  },

  // Chart Section
  chartSection: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 20, 
    margin: 16,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 10, 
    elevation: 5,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#FF6B35',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#888',
    fontWeight: '500',
    marginTop: 4,
    marginLeft: 28,
  },

  // Bar Chart
  chartContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    alignItems: 'flex-end', 
    height: 180,
    paddingHorizontal: 8,
  },
  barGroup: { 
    alignItems: 'center',
    flex: 1,
  },
  barValue: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF6B35',
    marginBottom: 6,
  },
  bar: { 
    width: 32, 
    height: 140, 
    backgroundColor: '#F0F4F3', 
    borderRadius: 8, 
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: { 
    width: '100%', 
    backgroundColor: '#FF6B35', 
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    minHeight: 4,
  },
  barGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '30%',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  barLabel: { 
    fontSize: 11, 
    color: '#666', 
    marginTop: 8,
    fontWeight: '600',
  },

  // Line Chart
  lineChartWrapper: {
    paddingTop: 30,
  },
  lineChartContainer: { 
    height: 140, 
    flexDirection: 'row', 
    alignItems: 'flex-end', 
    justifyContent: 'space-around',
    position: 'relative',
    marginHorizontal: 10,
  },
  linePoint: { 
    alignItems: 'center', 
    position: 'relative',
    flex: 1,
  },
  lineValue: {
    position: 'absolute',
    top: -25,
    fontSize: 11,
    fontWeight: '600',
    color: '#FF6B35',
  },
  lineDot: { 
    width: 12, 
    height: 12, 
    backgroundColor: '#FF6B35', 
    borderRadius: 6, 
    position: 'absolute',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  dotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
  },
  lineSegment: { 
    height: 3, 
    backgroundColor: '#FF6B35', 
    position: 'absolute', 
    left: 6,
  },
  lineLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingHorizontal: 10,
  },
  lineLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },

  // Services Section
  servicesSection: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 20, 
    margin: 16,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 10, 
    elevation: 5,
  },
  serviceRow: { 
    flexDirection: 'row', 
    alignItems: 'center',
    paddingVertical: 14, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F0F4F3',
  },
  serviceRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankNumber: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: { 
    fontSize: 15, 
    color: '#333',
    fontWeight: '600',
    marginBottom: 3,
  },
  serviceCount: { 
    fontSize: 12, 
    color: '#888',
    fontWeight: '500',
  },
  serviceRevenueContainer: {
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  serviceRevenue: { 
    fontSize: 13, 
    color: '#FF6B35', 
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 14,
    color: '#999',
  },

  // Summary Section
  summarySection: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 20, 
    margin: 16,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 10, 
    elevation: 5,
  },
  summaryCard: {
    backgroundColor: '#FFF8F5',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
    marginTop: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#555',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '700',
  },
});