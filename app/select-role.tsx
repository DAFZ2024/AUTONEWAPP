import { StyleSheet, View, Text, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';

const { width, height } = Dimensions.get('window');

export default function SelectRoleScreen() {
  const router = useRouter();
  
  // Animaciones
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim1 = useRef(new Animated.Value(0.8)).current;
  const scaleAnim2 = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim1, {
        toValue: 1,
        delay: 200,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
      Animated.spring(scaleAnim2, {
        toValue: 1,
        delay: 350,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
    ]).start();
  }, []);

  const handleClientRole = () => {
    router.push('./login?role=cliente');
  };

  const handleCompanyRole = () => {
    router.push('./login?role=empresa');
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <LinearGradient
      colors={['#0A4832', '#0C553C', '#0E6344']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {/* Decorative elements */}
      <View style={styles.decorativeCircle1} />
      <View style={styles.decorativeCircle2} />
      <View style={styles.decorativeCircle3} />
      
      {/* Glowing orbs */}
      <View style={styles.glowOrb1} />
      <View style={styles.glowOrb2} />
      
      <Animated.View 
        style={[
          styles.contentWrapper,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        {/* Logo con efecto glow */}
        <View style={styles.logoContainer}>
          <View style={styles.logoGlow} />
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.logo}
            contentFit="contain"
          />
        </View>
        
        {/* Título principal */}
        <View style={styles.headerContainer}>
          <Text style={styles.welcomeText}>Bienvenido a</Text>
          <Text style={styles.brandText}>AUTONEW</Text>
          <View style={styles.divider} />
          <Text style={styles.subtitle}>¿Cómo deseas continuar?</Text>
        </View>
        
        {/* Cards de selección - Diseño vertical */}
        <View style={styles.optionsContainer}>
          {/* Card Cliente */}
          <Animated.View style={[styles.cardWrapper, { transform: [{ scale: scaleAnim1 }] }]}>
            <TouchableOpacity 
              style={styles.roleCard} 
              onPress={handleClientRole}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#1A6B4C', '#0D4D35']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.cardGradient}
              >
                {/* Decoración superior */}
                <View style={styles.cardDecoration} />
                
                {/* Icono grande */}
                <View style={styles.iconCircle}>
                  <View style={styles.iconInner}>
                    <Ionicons name="person" size={32} color="#4ECCA3" />
                  </View>
                </View>
                
                {/* Contenido */}
                <Text style={styles.roleTitle}>Cliente</Text>
                <Text style={styles.roleDescription}>
                  Busca autolavados{'\n'}y agenda citas
                </Text>
                
                {/* Badge de acción */}
                <View style={styles.actionBadge}>
                  <Text style={styles.actionText}>Ingresar</Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
          
          {/* Card Empresa */}
          <Animated.View style={[styles.cardWrapper, { transform: [{ scale: scaleAnim2 }] }]}>
            <TouchableOpacity 
              style={styles.roleCard} 
              onPress={handleCompanyRole}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#1A6B4C', '#0D4D35']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.cardGradient}
              >
                {/* Decoración superior */}
                <View style={[styles.cardDecoration, styles.cardDecorationOrange]} />
                
                {/* Icono grande */}
                <View style={[styles.iconCircle, styles.iconCircleOrange]}>
                  <View style={[styles.iconInner, styles.iconInnerOrange]}>
                    <MaterialIcons name="storefront" size={32} color="#FFB347" />
                  </View>
                </View>
                
                {/* Contenido */}
                <Text style={styles.roleTitle}>Empresa</Text>
                <Text style={styles.roleDescription}>
                  Gestiona tu negocio{'\n'}y reservaciones
                </Text>
                
                {/* Badge de acción */}
                <View style={[styles.actionBadge, styles.actionBadgeOrange]}>
                  <Text style={styles.actionText}>Ingresar</Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
        
        {/* Botón Volver */}
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <View style={styles.backButtonContent}>
            <Ionicons name="arrow-back-circle-outline" size={22} color="rgba(255,255,255,0.7)" />
            <Text style={styles.backButtonText}>Volver al inicio</Text>
          </View>
        </TouchableOpacity>
        
        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Al continuar, aceptas nuestros términos y condiciones
          </Text>
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -120,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(78, 204, 163, 0.08)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -100,
    left: -100,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(78, 204, 163, 0.06)',
  },
  decorativeCircle3: {
    position: 'absolute',
    top: height * 0.3,
    left: -50,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 179, 71, 0.05)',
  },
  glowOrb1: {
    position: 'absolute',
    top: height * 0.15,
    right: 30,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ECCA3',
    shadowColor: '#4ECCA3',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
  glowOrb2: {
    position: 'absolute',
    bottom: height * 0.2,
    left: 40,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFB347',
    shadowColor: '#FFB347',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 5,
  },
  contentWrapper: {
    width: '100%',
    alignItems: 'center',
    zIndex: 1,
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  logoGlow: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: width * 0.3,
    height: width * 0.3,
    marginTop: -(width * 0.15),
    marginLeft: -(width * 0.15),
    borderRadius: width * 0.15,
    backgroundColor: 'rgba(78, 204, 163, 0.15)',
  },
  logo: {
    width: width * 0.28,
    height: width * 0.28,
    maxWidth: 140,
    maxHeight: 140,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  welcomeText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '400',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  brandText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 3,
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  divider: {
    width: 60,
    height: 3,
    backgroundColor: '#4ECCA3',
    borderRadius: 2,
    marginTop: 16,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.75)',
    fontWeight: '400',
    letterSpacing: 0.3,
  },
  optionsContainer: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 400,
    gap: 16,
    justifyContent: 'center',
  },
  cardWrapper: {
    flex: 1,
    maxWidth: 170,
  },
  roleCard: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  cardGradient: {
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    padding: 20,
    alignItems: 'center',
    minHeight: 200,
    position: 'relative',
    overflow: 'hidden',
  },
  cardDecoration: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(78, 204, 163, 0.15)',
  },
  cardDecorationOrange: {
    backgroundColor: 'rgba(255, 179, 71, 0.15)',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(78, 204, 163, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(78, 204, 163, 0.25)',
  },
  iconCircleOrange: {
    backgroundColor: 'rgba(255, 179, 71, 0.12)',
    borderColor: 'rgba(255, 179, 71, 0.25)',
  },
  iconInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(78, 204, 163, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconInnerOrange: {
    backgroundColor: 'rgba(255, 179, 71, 0.2)',
  },
  roleTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  roleDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.65)',
    lineHeight: 17,
    fontWeight: '400',
    textAlign: 'center',
    marginBottom: 16,
  },
  actionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4ECCA3',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#4ECCA3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  actionBadgeOrange: {
    backgroundColor: '#FFB347',
    shadowColor: '#FFB347',
  },
  actionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  backButton: {
    marginTop: 36,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  backButtonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  footer: {
    position: 'absolute',
    bottom: -80,
    width: width,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  footerText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});