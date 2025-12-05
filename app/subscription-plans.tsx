import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { getPlanesDisponibles, getMiSuscripcion, suscribirseAPlan, cancelarSuscripcion, Plan, Suscripcion } from '../services/api';

export default function SubscriptionPlans() {
  const router = useRouter();
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [miSuscripcion, setMiSuscripcion] = useState<Suscripcion | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: '', message: '', isSuccess: true });
  const [activeTab, setActiveTab] = useState<'mi-plan' | 'planes'>('planes');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [planesRes, suscripcionRes] = await Promise.all([
        getPlanesDisponibles(),
        getMiSuscripcion()
      ]);

      if (planesRes.success && planesRes.data) {
        setPlanes(planesRes.data);
      }

      if (suscripcionRes.success && suscripcionRes.data) {
        setMiSuscripcion(suscripcionRes.data);
        setActiveTab('mi-plan');
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setShowPlanModal(true);
  };

  const handleSuscribirse = async () => {
    if (!selectedPlan) return;

    try {
      setLoadingAction(true);
      setShowPlanModal(false);

      const response = await suscribirseAPlan({
        plan_id: selectedPlan.id_plan,
        metodo_pago: 'pendiente',
        referencia_pago: `REF-${Date.now()}`
      });

      if (response.success) {
        setSuccessMessage({
          title: '¡Suscripción Exitosa!',
          message: `Te has suscrito al plan ${selectedPlan.nombre}. Disfruta de todos los beneficios.`,
          isSuccess: true
        });
        setShowSuccessModal(true);
        loadData(); // Recargar datos
      } else {
        setSuccessMessage({
          title: 'Error',
          message: response.message || 'No se pudo procesar la suscripción',
          isSuccess: false
        });
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('Error al suscribirse:', error);
      setSuccessMessage({
        title: 'Error',
        message: 'Ocurrió un error al procesar la suscripción',
        isSuccess: false
      });
      setShowSuccessModal(true);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCancelarSuscripcion = async () => {
    if (!miSuscripcion) return;

    Alert.alert(
      'Cancelar Suscripción',
      '¿Estás seguro de que deseas cancelar tu suscripción? Podrás seguir usando los beneficios hasta la fecha de vencimiento.',
      [
        { text: 'No, mantener', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoadingAction(true);
              const response = await cancelarSuscripcion(miSuscripcion.id_suscripcion);

              if (response.success) {
                setSuccessMessage({
                  title: 'Suscripción Cancelada',
                  message: 'Tu suscripción ha sido cancelada. Podrás seguir usando los beneficios hasta la fecha de vencimiento.',
                  isSuccess: true
                });
                setShowSuccessModal(true);
                loadData();
              } else {
                Alert.alert('Error', response.message || 'No se pudo cancelar la suscripción');
              }
            } catch (error) {
              Alert.alert('Error', 'Ocurrió un error al cancelar la suscripción');
            } finally {
              setLoadingAction(false);
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateStr: string) => {
    const fecha = new Date(dateStr);
    return fecha.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getPlanIcon = (tipo: string) => {
    switch (tipo) {
      case 'basico': return 'water-outline';
      case 'premium': return 'star-outline';
      case 'completo': return 'diamond-outline';
      default: return 'pricetag-outline';
    }
  };

  const getPlanColor = (tipo: string) => {
    switch (tipo) {
      case 'basico': return '#3B82F6';
      case 'premium': return '#F59E0B';
      case 'completo': return '#8B5CF6';
      default: return '#0C553C';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0C553C" />
        <Text style={styles.loadingText}>Cargando planes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <View style={styles.backButtonIcon}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </View>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Planes de Suscripción</Text>
          <Text style={styles.headerSubtitle}>Ahorra en cada lavado</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'mi-plan' && styles.tabActive]}
          onPress={() => setActiveTab('mi-plan')}
        >
          <Ionicons 
            name="ribbon" 
            size={18} 
            color={activeTab === 'mi-plan' ? '#0C553C' : '#888'} 
          />
          <Text style={[styles.tabText, activeTab === 'mi-plan' && styles.tabTextActive]}>
            Mi Plan
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'planes' && styles.tabActive]}
          onPress={() => setActiveTab('planes')}
        >
          <Ionicons 
            name="pricetags" 
            size={18} 
            color={activeTab === 'planes' ? '#0C553C' : '#888'} 
          />
          <Text style={[styles.tabText, activeTab === 'planes' && styles.tabTextActive]}>
            Ver Planes
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'mi-plan' ? (
          <>
            {miSuscripcion ? (
              <View style={styles.myPlanContainer}>
                {/* Plan Activo */}
                <View style={[styles.activePlanCard, { borderColor: getPlanColor(miSuscripcion.plan_tipo) }]}>
                  <View style={[styles.activePlanBadge, { backgroundColor: getPlanColor(miSuscripcion.plan_tipo) }]}>
                    <Ionicons name="checkmark-circle" size={14} color="#fff" />
                    <Text style={styles.activePlanBadgeText}>Activo</Text>
                  </View>
                  
                  <View style={styles.activePlanHeader}>
                    <View style={[styles.activePlanIconBg, { backgroundColor: `${getPlanColor(miSuscripcion.plan_tipo)}15` }]}>
                      <Ionicons name={getPlanIcon(miSuscripcion.plan_tipo) as any} size={32} color={getPlanColor(miSuscripcion.plan_tipo)} />
                    </View>
                    <View style={styles.activePlanInfo}>
                      <Text style={styles.activePlanName}>{miSuscripcion.plan_nombre}</Text>
                      <Text style={styles.activePlanPrice}>
                        ${miSuscripcion.precio_mensual?.toLocaleString()}/mes
                      </Text>
                    </View>
                  </View>

                  {/* Estadísticas */}
                  <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                      <Ionicons name="calendar" size={20} color="#0C553C" />
                      <Text style={styles.statValue}>{miSuscripcion.dias_restantes}</Text>
                      <Text style={styles.statLabel}>Días restantes</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Ionicons name="car-sport" size={20} color="#0C553C" />
                      <Text style={styles.statValue}>
                        {typeof miSuscripcion.servicios_restantes === 'string' 
                          ? '∞' 
                          : miSuscripcion.servicios_restantes}
                      </Text>
                      <Text style={styles.statLabel}>Servicios disponibles</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Ionicons name="checkmark-done" size={20} color="#0C553C" />
                      <Text style={styles.statValue}>{miSuscripcion.servicios_utilizados_mes}</Text>
                      <Text style={styles.statLabel}>Usados este mes</Text>
                    </View>
                  </View>

                  {/* Fechas */}
                  <View style={styles.datesContainer}>
                    <View style={styles.dateRow}>
                      <Text style={styles.dateLabel}>Inicio:</Text>
                      <Text style={styles.dateValue}>{formatDate(miSuscripcion.fecha_inicio)}</Text>
                    </View>
                    <View style={styles.dateRow}>
                      <Text style={styles.dateLabel}>Vence:</Text>
                      <Text style={styles.dateValue}>{formatDate(miSuscripcion.fecha_fin)}</Text>
                    </View>
                  </View>

                  {/* Características incluidas */}
                  <Text style={styles.featuresTitle}>Incluye:</Text>
                  <View style={styles.featuresGrid}>
                    {miSuscripcion.incluye_lavado_exterior && (
                      <View style={styles.featureItem}>
                        <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                        <Text style={styles.featureText}>Lavado exterior</Text>
                      </View>
                    )}
                    {miSuscripcion.incluye_aspirado && (
                      <View style={styles.featureItem}>
                        <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                        <Text style={styles.featureText}>Aspirado</Text>
                      </View>
                    )}
                    {miSuscripcion.incluye_lavado_asientos && (
                      <View style={styles.featureItem}>
                        <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                        <Text style={styles.featureText}>Lavado asientos</Text>
                      </View>
                    )}
                    {miSuscripcion.incluye_lavado_interior_humedo && (
                      <View style={styles.featureItem}>
                        <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                        <Text style={styles.featureText}>Lavado interior húmedo</Text>
                      </View>
                    )}
                    {miSuscripcion.incluye_encerado && (
                      <View style={styles.featureItem}>
                        <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                        <Text style={styles.featureText}>Encerado</Text>
                      </View>
                    )}
                    {miSuscripcion.incluye_detallado_completo && (
                      <View style={styles.featureItem}>
                        <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                        <Text style={styles.featureText}>Detallado completo</Text>
                      </View>
                    )}
                  </View>

                  {/* Botón cancelar */}
                  <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={handleCancelarSuscripcion}
                    disabled={loadingAction}
                  >
                    <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
                    <Text style={styles.cancelButtonText}>Cancelar suscripción</Text>
                  </TouchableOpacity>
                </View>

                {/* Servicios incluidos */}
                {miSuscripcion.servicios_incluidos && miSuscripcion.servicios_incluidos.length > 0 && (
                  <View style={styles.servicesSection}>
                    <Text style={styles.servicesSectionTitle}>Servicios con descuento</Text>
                    {miSuscripcion.servicios_incluidos.map((servicio, idx) => (
                      <View key={idx} style={styles.serviceRow}>
                        <View style={styles.serviceInfo}>
                          <Text style={styles.serviceName}>{servicio.nombre_servicio}</Text>
                          <Text style={styles.servicePrice}>
                            Precio normal: ${servicio.precio?.toLocaleString()}
                          </Text>
                        </View>
                        {servicio.porcentaje_descuento > 0 && (
                          <View style={styles.discountBadge}>
                            <Text style={styles.discountText}>-{servicio.porcentaje_descuento}%</Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.noPlanContainer}>
                <View style={styles.noPlanIconBg}>
                  <Ionicons name="ribbon-outline" size={48} color="#888" />
                </View>
                <Text style={styles.noPlanTitle}>Sin plan activo</Text>
                <Text style={styles.noPlanText}>
                  Aún no tienes una suscripción activa. ¡Explora nuestros planes y ahorra en cada lavado!
                </Text>
                <TouchableOpacity 
                  style={styles.explorePlansBtn}
                  onPress={() => setActiveTab('planes')}
                >
                  <Ionicons name="pricetags" size={20} color="#fff" />
                  <Text style={styles.explorePlansBtnText}>Ver planes disponibles</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : (
          <>
            {/* Lista de planes */}
            <Text style={styles.planesIntro}>
              Elige el plan que mejor se adapte a tus necesidades y ahorra en cada servicio.
            </Text>

            {planes.map((plan) => {
              const isCurrentPlan = miSuscripcion?.id_plan === plan.id_plan;
              const planColor = getPlanColor(plan.tipo);

              return (
                <TouchableOpacity 
                  key={plan.id_plan}
                  style={[
                    styles.planCard,
                    isCurrentPlan && styles.planCardCurrent,
                    { borderColor: planColor }
                  ]}
                  onPress={() => !isCurrentPlan && handleSelectPlan(plan)}
                  activeOpacity={isCurrentPlan ? 1 : 0.8}
                  disabled={isCurrentPlan}
                >
                  {isCurrentPlan && (
                    <View style={[styles.currentPlanBadge, { backgroundColor: planColor }]}>
                      <Text style={styles.currentPlanBadgeText}>Tu plan actual</Text>
                    </View>
                  )}

                  <View style={styles.planCardHeader}>
                    <View style={[styles.planIconBg, { backgroundColor: `${planColor}15` }]}>
                      <Ionicons name={getPlanIcon(plan.tipo) as any} size={28} color={planColor} />
                    </View>
                    <View style={styles.planHeaderInfo}>
                      <Text style={styles.planName}>{plan.nombre}</Text>
                      <Text style={[styles.planType, { color: planColor }]}>
                        {plan.tipo.charAt(0).toUpperCase() + plan.tipo.slice(1)}
                      </Text>
                    </View>
                    <View style={styles.planPriceContainer}>
                      <Text style={styles.planPrice}>${plan.precio_mensual?.toLocaleString()}</Text>
                      <Text style={styles.planPricePeriod}>/mes</Text>
                    </View>
                  </View>

                  <Text style={styles.planDescription}>{plan.descripcion}</Text>

                  <View style={styles.planServicesCount}>
                    <Ionicons name="car-sport" size={16} color="#0C553C" />
                    <Text style={styles.planServicesText}>
                      {plan.cantidad_servicios_mes === 0 
                        ? 'Servicios ilimitados' 
                        : `${plan.cantidad_servicios_mes} servicios/mes`}
                    </Text>
                  </View>

                  {/* Características */}
                  <View style={styles.planFeatures}>
                    {plan.incluye_lavado_exterior && (
                      <View style={styles.planFeatureItem}>
                        <Ionicons name="checkmark" size={14} color="#10B981" />
                        <Text style={styles.planFeatureText}>Lavado exterior</Text>
                      </View>
                    )}
                    {plan.incluye_aspirado && (
                      <View style={styles.planFeatureItem}>
                        <Ionicons name="checkmark" size={14} color="#10B981" />
                        <Text style={styles.planFeatureText}>Aspirado</Text>
                      </View>
                    )}
                    {plan.incluye_encerado && (
                      <View style={styles.planFeatureItem}>
                        <Ionicons name="checkmark" size={14} color="#10B981" />
                        <Text style={styles.planFeatureText}>Encerado</Text>
                      </View>
                    )}
                    {plan.incluye_detallado_completo && (
                      <View style={styles.planFeatureItem}>
                        <Ionicons name="checkmark" size={14} color="#10B981" />
                        <Text style={styles.planFeatureText}>Detallado completo</Text>
                      </View>
                    )}
                  </View>

                  {/* Servicios incluidos con descuento */}
                  {plan.servicios_incluidos && plan.servicios_incluidos.length > 0 && (
                    <View style={styles.planServicesSection}>
                      <Text style={styles.planServicesSectionTitle}>Servicios con descuento:</Text>
                      {plan.servicios_incluidos.map((servicio, idx) => (
                        <View key={idx} style={styles.planServiceRow}>
                          <View style={styles.planServiceInfo}>
                            <Ionicons name="car-sport-outline" size={14} color="#0C553C" />
                            <Text style={styles.planServiceName} numberOfLines={1}>{servicio.nombre_servicio}</Text>
                          </View>
                          {servicio.porcentaje_descuento > 0 && (
                            <View style={[styles.planDiscountBadge, { backgroundColor: `${planColor}20` }]}>
                              <Text style={[styles.planDiscountText, { color: planColor }]}>
                                -{servicio.porcentaje_descuento}%
                              </Text>
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  )}

                  {!isCurrentPlan && (
                    <View style={[styles.selectPlanBtn, { backgroundColor: planColor }]}>
                      <Text style={styles.selectPlanBtnText}>Elegir este plan</Text>
                      <Ionicons name="arrow-forward" size={18} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Modal de confirmación de plan */}
      <Modal
        visible={showPlanModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPlanModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <View style={[styles.confirmModalHeader, { backgroundColor: selectedPlan ? getPlanColor(selectedPlan.tipo) : '#0C553C' }]}>
              <View style={styles.confirmModalIcon}>
                <Ionicons name={selectedPlan ? getPlanIcon(selectedPlan.tipo) as any : 'pricetag'} size={32} color="#fff" />
              </View>
              <Text style={styles.confirmModalTitle}>Confirmar Suscripción</Text>
            </View>

            {selectedPlan && (
              <View style={styles.confirmModalContent}>
                <Text style={styles.confirmPlanName}>{selectedPlan.nombre}</Text>
                <Text style={styles.confirmPlanPrice}>
                  ${selectedPlan.precio_mensual?.toLocaleString()}/mes
                </Text>
                <Text style={styles.confirmPlanDesc}>{selectedPlan.descripcion}</Text>

                <View style={styles.confirmInfoBox}>
                  <Ionicons name="information-circle" size={20} color="#3B82F6" />
                  <Text style={styles.confirmInfoText}>
                    Tu suscripción comenzará inmediatamente y tendrá una duración de 30 días.
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.confirmModalButtons}>
              <TouchableOpacity 
                style={styles.confirmCancelBtn}
                onPress={() => setShowPlanModal(false)}
              >
                <Text style={styles.confirmCancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.confirmBtn, { backgroundColor: selectedPlan ? getPlanColor(selectedPlan.tipo) : '#0C553C' }]}
                onPress={handleSuscribirse}
                disabled={loadingAction}
              >
                {loadingAction ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.confirmBtnText}>Suscribirme</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de éxito/error */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModal}>
            <View style={[
              styles.successIconCircle,
              !successMessage.isSuccess && styles.errorIconCircle
            ]}>
              <Ionicons 
                name={successMessage.isSuccess ? "checkmark" : "close"} 
                size={48} 
                color="#fff" 
              />
            </View>
            <Text style={[styles.successTitle, !successMessage.isSuccess && styles.errorTitle]}>
              {successMessage.title}
            </Text>
            <Text style={styles.successMessage}>{successMessage.message}</Text>
            <TouchableOpacity 
              style={styles.successBtn}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.successBtnText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Loading overlay */}
      {loadingAction && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#0C553C" />
        </View>
      )}
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
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#0C553C',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backButton: {
    marginRight: 12,
  },
  backButtonIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabActive: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#0C553C',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
  tabTextActive: {
    color: '#0C553C',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  // Mi Plan
  myPlanContainer: {},
  activePlanCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  activePlanBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  activePlanBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  activePlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  activePlanIconBg: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  activePlanInfo: {
    flex: 1,
  },
  activePlanName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  activePlanPrice: {
    fontSize: 16,
    color: '#666',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F0FDF4',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0C553C',
    marginTop: 6,
  },
  statLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
    textAlign: 'center',
  },
  datesContainer: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  dateLabel: {
    fontSize: 13,
    color: '#888',
  },
  dateValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  featuresTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 10,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  featureText: {
    fontSize: 12,
    color: '#0C553C',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
    gap: 6,
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '600',
  },
  servicesSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  servicesSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  servicePrice: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  discountBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  discountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  // Sin plan
  noPlanContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  noPlanIconBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  noPlanTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 10,
  },
  noPlanText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  explorePlansBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0C553C',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  explorePlansBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  // Planes disponibles
  planesIntro: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  planCardCurrent: {
    opacity: 0.7,
  },
  currentPlanBadge: {
    position: 'absolute',
    top: -10,
    left: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentPlanBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  planCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  planIconBg: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  planHeaderInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  planType: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  planPriceContainer: {
    alignItems: 'flex-end',
  },
  planPrice: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0C553C',
  },
  planPricePeriod: {
    fontSize: 12,
    color: '#888',
  },
  planDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  planServicesCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  planServicesText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0C553C',
  },
  planFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  planFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  planFeatureText: {
    fontSize: 12,
    color: '#666',
  },
  selectPlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  selectPlanBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModal: {
    backgroundColor: '#fff',
    borderRadius: 24,
    width: '100%',
    overflow: 'hidden',
  },
  confirmModalHeader: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  confirmModalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  confirmModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  confirmModalContent: {
    padding: 20,
    alignItems: 'center',
  },
  confirmPlanName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  confirmPlanPrice: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0C553C',
    marginBottom: 12,
  },
  confirmPlanDesc: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  confirmInfoBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 10,
    gap: 10,
    alignItems: 'flex-start',
  },
  confirmInfoText: {
    flex: 1,
    fontSize: 13,
    color: '#3B82F6',
    lineHeight: 18,
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 14,
    borderRadius: 12,
  },
  confirmCancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  confirmBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  // Success modal
  successModal: {
    backgroundColor: '#fff',
    borderRadius: 24,
    width: '100%',
    padding: 30,
    alignItems: 'center',
  },
  successIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#0C553C',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorIconCircle: {
    backgroundColor: '#EF4444',
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0C553C',
    marginBottom: 10,
  },
  errorTitle: {
    color: '#EF4444',
  },
  successMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  successBtn: {
    width: '100%',
    backgroundColor: '#0C553C',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  successBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Estilos para servicios incluidos en planes
  planServicesSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  planServicesSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  planServiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 4,
  },
  planServiceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  planServiceName: {
    fontSize: 12,
    color: '#333',
    flex: 1,
  },
  planDiscountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  planDiscountText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
