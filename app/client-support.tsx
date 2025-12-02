import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface FAQItem {
  id: number;
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    id: 1,
    question: '¿Cómo puedo agendar una cita?',
    answer: 'Para agendar una cita, ve a la pantalla principal y presiona "Reservar Cita". Selecciona el servicio que deseas, elige la empresa, fecha y hora disponible, y confirma tu reserva.',
  },
  {
    id: 2,
    question: '¿Cómo cancelo una reserva?',
    answer: 'Puedes cancelar tu reserva desde "Mis Citas". Busca la cita que deseas cancelar y presiona el botón de cancelar. Recuerda que solo puedes cancelar con al menos 2 horas de anticipación.',
  },
  {
    id: 3,
    question: '¿Qué métodos de pago aceptan?',
    answer: 'El pago se realiza directamente en el establecimiento después de recibir el servicio. Cada empresa puede aceptar diferentes métodos como efectivo, tarjeta de débito/crédito o transferencia.',
  },
  {
    id: 4,
    question: '¿Cómo funciona el sistema de reservas?',
    answer: 'Al hacer una reserva, recibirás un código QR único. Cuando llegues a la empresa, muestra este código para que puedan verificar tu cita y comenzar el servicio.',
  },
  {
    id: 5,
    question: '¿Qué hago si la empresa no atiende mi cita?',
    answer: 'Si tienes problemas con tu cita, puedes contactarnos a través del formulario de esta sección o llamar a nuestra línea de soporte. Investigaremos tu caso y te ayudaremos a resolverlo.',
  },
  {
    id: 6,
    question: '¿Cómo actualizo mi información personal?',
    answer: 'Ve a "Mi Perfil" desde el menú principal. Allí podrás actualizar tu nombre, teléfono, dirección y foto de perfil. También puedes cambiar tu contraseña desde la sección de seguridad.',
  },
];

export default function ClientSupport() {
  const router = useRouter();
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const toggleFAQ = (id: number) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  const handleCall = () => {
    const phoneNumber = 'tel:+573001234567';
    Linking.canOpenURL(phoneNumber)
      .then((supported) => {
        if (supported) {
          Linking.openURL(phoneNumber);
        } else {
          Alert.alert('Error', 'No se puede realizar la llamada desde este dispositivo');
        }
      })
      .catch((err) => console.error('Error al intentar llamar:', err));
  };

  const handleWhatsApp = () => {
    const whatsappNumber = '+573001234567';
    const whatsappMessage = 'Hola, necesito ayuda con la app AutoNew';
    const url = `whatsapp://send?phone=${whatsappNumber}&text=${encodeURIComponent(whatsappMessage)}`;
    
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert('Error', 'WhatsApp no está instalado en este dispositivo');
        }
      })
      .catch((err) => console.error('Error al abrir WhatsApp:', err));
  };

  const handleEmail = () => {
    const email = 'soporte@autonew.com';
    const emailSubject = 'Soporte AutoNew App';
    const url = `mailto:${email}?subject=${encodeURIComponent(emailSubject)}`;
    
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert('Error', 'No hay aplicación de correo configurada');
        }
      })
      .catch((err) => console.error('Error al abrir correo:', err));
  };

  const handleSendMessage = async () => {
    if (!subject.trim()) {
      Alert.alert('Error', 'Por favor ingresa un asunto');
      return;
    }
    if (!message.trim()) {
      Alert.alert('Error', 'Por favor escribe tu mensaje');
      return;
    }

    setSending(true);
    
    // Simular envío (aquí podrías integrar con tu backend)
    setTimeout(() => {
      setSending(false);
      setSubject('');
      setMessage('');
      Alert.alert(
        '¡Mensaje enviado!',
        'Hemos recibido tu mensaje. Te responderemos lo antes posible a través de tu correo electrónico.',
        [{ text: 'Entendido', style: 'default' }]
      );
    }, 1500);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Soporte</Text>
        <View style={{ width: 70 }} />
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Sección de contacto rápido */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contacto Rápido</Text>
          <Text style={styles.sectionSubtitle}>
            ¿Necesitas ayuda inmediata? Contáctanos por cualquiera de estos medios
          </Text>
          
          <View style={styles.contactButtons}>
            <TouchableOpacity style={styles.contactButton} onPress={handleCall}>
              <View style={[styles.contactIconContainer, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="call" size={24} color="#1976D2" />
              </View>
              <Text style={styles.contactButtonText}>Llamar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.contactButton} onPress={handleWhatsApp}>
              <View style={[styles.contactIconContainer, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
              </View>
              <Text style={styles.contactButtonText}>WhatsApp</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.contactButton} onPress={handleEmail}>
              <View style={[styles.contactIconContainer, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="mail" size={24} color="#FF9800" />
              </View>
              <Text style={styles.contactButtonText}>Email</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Preguntas frecuentes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preguntas Frecuentes</Text>
          
          {faqs.map((faq) => (
            <TouchableOpacity
              key={faq.id}
              style={styles.faqItem}
              onPress={() => toggleFAQ(faq.id)}
              activeOpacity={0.7}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion}>{faq.question}</Text>
                <Ionicons
                  name={expandedFAQ === faq.id ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#666"
                />
              </View>
              {expandedFAQ === faq.id && (
                <Text style={styles.faqAnswer}>{faq.answer}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Formulario de contacto */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Envíanos un mensaje</Text>
          <Text style={styles.sectionSubtitle}>
            ¿No encontraste respuesta a tu pregunta? Escríbenos y te ayudaremos
          </Text>
          
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Asunto</Text>
              <TextInput
                style={styles.input}
                value={subject}
                onChangeText={setSubject}
                placeholder="¿En qué podemos ayudarte?"
                placeholderTextColor="#999"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mensaje</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={message}
                onChangeText={setMessage}
                placeholder="Describe tu problema o consulta con el mayor detalle posible..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </View>
            
            <TouchableOpacity
              style={[styles.sendButton, sending && styles.sendButtonDisabled]}
              onPress={handleSendMessage}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="send" size={18} color="#fff" />
                  <Text style={styles.sendButtonText}>Enviar Mensaje</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Horario de atención */}
        <View style={styles.scheduleCard}>
          <View style={styles.scheduleHeader}>
            <Ionicons name="time-outline" size={24} color="#0C553C" />
            <Text style={styles.scheduleTitle}>Horario de Atención</Text>
          </View>
          <View style={styles.scheduleContent}>
            <View style={styles.scheduleRow}>
              <Text style={styles.scheduleDay}>Lunes a Viernes</Text>
              <Text style={styles.scheduleTime}>8:00 AM - 6:00 PM</Text>
            </View>
            <View style={styles.scheduleRow}>
              <Text style={styles.scheduleDay}>Sábados</Text>
              <Text style={styles.scheduleTime}>9:00 AM - 2:00 PM</Text>
            </View>
            <View style={styles.scheduleRow}>
              <Text style={styles.scheduleDay}>Domingos y Festivos</Text>
              <Text style={[styles.scheduleTime, { color: '#DC3545' }]}>Cerrado</Text>
            </View>
          </View>
        </View>

        {/* Info adicional */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color="#666" />
          <Text style={styles.infoText}>
            Nuestro equipo de soporte responde generalmente en un plazo de 24 horas hábiles.
          </Text>
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
    paddingBottom: 18,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '700',
    marginLeft: 4,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3.84,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  contactButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  contactButton: {
    alignItems: 'center',
  },
  contactIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  contactButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  faqItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 14,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
    lineHeight: 22,
  },
  form: {
    marginTop: 8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0C553C',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#f8f8f8',
    color: '#333',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  sendButton: {
    backgroundColor: '#0C553C',
    borderRadius: 10,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  scheduleCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3.84,
    elevation: 3,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  scheduleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  scheduleContent: {
    gap: 12,
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  scheduleDay: {
    fontSize: 15,
    color: '#333',
  },
  scheduleTime: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0C553C',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 10,
    flex: 1,
    lineHeight: 18,
  },
});
