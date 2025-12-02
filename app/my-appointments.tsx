import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList, Modal, TextInput, SectionList, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { getReservasUsuario, Reserva, getUser, verificarYCompletarReservaQR } from '../services/api';

export default function MyAppointments() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');

  const [selected, setSelected] = useState<Reserva | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  
  // Estados para reagendar (por implementar con backend real)
  const [showReschedule, setShowReschedule] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');

  // Estados para el escáner QR
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

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

  const handleCancel = async (id: number) => {
    // Aquí iría la llamada al backend para cancelar
    Alert.alert('Info', 'Funcionalidad de cancelación en desarrollo');
    closeDetails();
  };

  // Función para verificar si se puede editar (12 horas antes)
  const canEditReservation = (reserva: Reserva): { canEdit: boolean; hoursRemaining: number } => {
    const fechaReserva = new Date(`${reserva.fecha}T${reserva.hora}`);
    const ahora = new Date();
    const diferenciaMs = fechaReserva.getTime() - ahora.getTime();
    const horasRestantes = diferenciaMs / (1000 * 60 * 60);
    
    return {
      canEdit: horasRestantes >= 12,
      hoursRemaining: Math.max(0, Math.floor(horasRestantes))
    };
  };

  const startReschedule = (item: Reserva) => {
    const { canEdit, hoursRemaining } = canEditReservation(item);
    
    if (!canEdit) {
      Alert.alert(
        '⚠️ No es posible reagendar',
        `Solo puedes reagendar tu cita hasta 12 horas antes de la hora programada.\n\nTu cita está programada para:\n📅 ${new Date(item.fecha).toLocaleDateString()}\n🕐 ${item.hora.toString().substring(0, 5)}\n\nTiempo restante: ${hoursRemaining} horas.\n\nSi necesitas cancelar o modificar, por favor contacta a soporte.`,
        [{ text: 'Entendido', style: 'default' }]
      );
      return;
    }
    
    // Mostrar información al usuario antes de continuar
    Alert.alert(
      '📝 Reagendar Cita',
      `Puedes modificar únicamente la fecha y hora de tu reserva.\n\n⏰ Recuerda: Los cambios deben realizarse al menos 12 horas antes de la cita.\n\nTiempo disponible para cambios: ${hoursRemaining} horas`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Continuar', 
          onPress: () => {
            setSelected(item);
            setNewDate(item.fecha.toString().split('T')[0]);
            setNewTime(item.hora.toString().substring(0, 5));
            setShowReschedule(true);
          }
        }
      ]
    );
  };

  const confirmReschedule = () => {
    // Aquí iría la llamada al backend para reagendar
    Alert.alert('Info', 'Funcionalidad de reagendar en desarrollo');
    setShowReschedule(false);
    setSelected(null);
  };

  const getServiceIcon = (nombreServicio: string) => {
    if (nombreServicio.toLowerCase().includes('lavado')) return '🚗';
    if (nombreServicio.toLowerCase().includes('desinfección')) return '🧼';
    return '🔧';
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
      let qrData;
      try {
        qrData = JSON.parse(data);
      } catch {
        // Si no es JSON, asumir que es solo el número de reserva
        qrData = { numero_reserva: data };
      }
      
      const numeroReserva = qrData.numero_reserva || data;
      console.log('Número de reserva a verificar:', numeroReserva);
      
      const response = await verificarYCompletarReservaQR({ numero_reserva: numeroReserva });
      
      if (response.success) {
        Alert.alert(
          '✅ ¡Servicio Completado!',
          `Tu reserva #${numeroReserva} ha sido marcada como completada.\n\n¡Gracias por usar nuestro servicio!`,
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
          '❌ Error',
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
        '❌ Error',
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
    
    const fechaFormat = new Date(item.fecha).toLocaleDateString();
    
    return (
      <TouchableOpacity style={styles.card} onPress={() => openDetails(item)}>
        <View style={styles.cardIcon}>
          <Text style={styles.iconText}>{getServiceIcon(nombreServicio)}</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.service}>{nombreServicio} {item.servicios && item.servicios.length > 1 ? `+ ${item.servicios.length - 1}` : ''}</Text>
          <Text style={styles.meta}>{fechaFormat} · {item.hora.toString().substring(0, 5)}</Text>
          <Text style={styles.location}>{item.nombre_empresa}</Text>
          <Text style={[
            styles.status, 
            (item.estado === 'pendiente' || item.estado === 'confirmada' || item.estado === 'en_proceso') ? styles.pending : 
            (item.estado === 'completada' || item.estado === 'completado') ? styles.done : styles.cancelled
          ]}>
            {item.estado.toUpperCase()}
          </Text>
        </View>
        <View style={styles.cardActions}>
          {(item.estado === 'pendiente' || item.estado === 'confirmada' || item.estado === 'en_proceso') && (
            <>
              <TouchableOpacity style={styles.qrScanBtn} onPress={openQRScanner}>
                <Text style={styles.qrScanBtnText}>📷 Escanear QR</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => startReschedule(item)}>
                <Text style={styles.actionText}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={() => handleCancel(item.id_reserva)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
            </>
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
        <TouchableOpacity onPress={() => router.replace('./client-dashboard')} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Mis Citas</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterBtn, activeTab === 'upcoming' && styles.filterActive]}
            onPress={() => setActiveTab('upcoming')}
          >
            <Text style={[styles.filterText, activeTab === 'upcoming' && styles.filterTextActive]}>Próximas</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterBtn, activeTab === 'history' && styles.filterActive]}
            onPress={() => setActiveTab('history')}
          >
            <Text style={[styles.filterText, activeTab === 'history' && styles.filterTextActive]}>Completadas</Text>
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

      {/* Details Modal */}
      <Modal visible={showDetails} animationType="slide" transparent>
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Detalles de la cita</Text>
            {selected && (
              <>
                <Text style={styles.modalService}>
                  {selected.servicios?.map(s => s.nombre_servicio).join(', ')}
                </Text>
                <Text style={styles.modalMeta}>
                  {new Date(selected.fecha).toLocaleDateString()} · {selected.hora.toString().substring(0, 5)}
                </Text>
                <Text style={styles.modalMeta}>{selected.nombre_empresa}</Text>
                <Text style={styles.modalMeta}>{selected.direccion_empresa}</Text>
                <Text style={[styles.modalPrice, { marginTop: 10 }]}>
                  Total: ${parseFloat(selected.total.toString()).toLocaleString()}
                </Text>
                
                <View style={{ flexDirection: 'row', marginTop: 20, justifyContent: 'space-between' }}>
                  {(selected.estado === 'pendiente' || selected.estado === 'confirmada') && (
                    <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#e74c3c', flex: 1, marginRight: 5 }]} onPress={() => handleCancel(selected.id_reserva)}>
                      <Text style={[styles.modalBtnText, { color: '#fff' }]}>Cancelar</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#eef2f3', flex: 1, marginLeft: 5 }]} onPress={closeDetails}>
                    <Text style={styles.modalBtnText}>Cerrar</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Reschedule Modal */}
      <Modal visible={showReschedule} animationType="slide" transparent>
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>📅 Reagendar Cita</Text>
            
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>ℹ️ Solo puedes modificar la fecha y hora.</Text>
              <Text style={styles.infoText}>⏰ Cambios permitidos hasta 12 horas antes.</Text>
            </View>
            
            <Text style={styles.inputLabel}>Nueva Fecha:</Text>
            <TextInput 
              style={styles.input} 
              value={newDate} 
              onChangeText={setNewDate} 
              placeholder="YYYY-MM-DD" 
            />
            
            <Text style={styles.inputLabel}>Nueva Hora:</Text>
            <TextInput 
              style={styles.input} 
              value={newTime} 
              onChangeText={setNewTime} 
              placeholder="HH:MM (ej: 09:00)" 
            />
            
            <View style={{ flexDirection: 'row', marginTop: 15 }}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#0C553C', flex: 1, marginRight: 5 }]} onPress={confirmReschedule}>
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Guardar Cambios</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#eef2f3', flex: 1, marginLeft: 5 }]} onPress={() => { setShowReschedule(false); setSelected(null); }}>
                <Text style={styles.modalBtnText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
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
              <Text style={styles.scannerCloseBtnText}>✕ Cerrar</Text>
            </TouchableOpacity>
            <Text style={styles.scannerTitle}>Escanear QR</Text>
            <View style={{ width: 80 }} />
          </View>
          
          <View style={styles.scannerContent}>
            <View style={styles.scannerInstructions}>
              <Text style={styles.scannerInstructionsText}>
                📱 Escanea el código QR que te muestra la empresa para confirmar que el servicio fue completado
              </Text>
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
  header: { 
    backgroundColor: '#0C553C', 
    paddingTop: 50, 
    paddingBottom: 18, 
    flexDirection: 'row', 
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  backButton: { 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  backButtonText: { 
    color: '#fff', 
    fontWeight: '700',
    fontSize: 15,
  },
  headerSpacer: {
    width: 85,
  },
  title: { color: '#fff', fontSize: 20, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  content: { flex: 1, padding: 16 },
  filterContainer: { flexDirection: 'row', marginBottom: 16, backgroundColor: '#fff', borderRadius: 8, padding: 4 },
  filterBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  filterActive: { backgroundColor: '#0C553C' },
  filterText: { fontSize: 14, color: '#666' },
  filterTextActive: { color: '#fff', fontWeight: '600' },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', color: '#0C553C', marginBottom: 8, marginTop: 16 },
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
    lineHeight: 22 
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
});

