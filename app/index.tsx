import { Image } from 'expo-image';
import { StyleSheet, View, Dimensions, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp, FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();

  const handleIniciar = () => {
    router.push('./select-role');
  };

  return (
    <LinearGradient
      colors={['#0C553C', '#0C553C', '#085c3a', '#052e21']}
      locations={[0, 0.35, 0.6, 1]}
      style={styles.container}
    >
      {/* Círculos decorativos de fondo */}
      <View style={styles.decorativeCircle1} />
      <View style={styles.decorativeCircle2} />
      <View style={styles.decorativeCircle3} />

      {/* Contenido principal */}
      <View style={styles.content}>
        {/* Logo con animación */}
        <Animated.View 
          entering={FadeInDown.delay(200).duration(800).springify()}
          style={styles.logoContainer}
        >
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.centerImage}
            contentFit="contain"
          />
        </Animated.View>

        {/* Texto de bienvenida */}
        <Animated.View 
          entering={FadeIn.delay(600).duration(800)}
          style={styles.welcomeContainer}
        >
          <Text style={styles.welcomeText}>Bienvenido a</Text>
          <Text style={styles.appName}>AUTONEW</Text>
          <Text style={styles.tagline}>Tu lavado de auto, a un toque de distancia</Text>
        </Animated.View>

        {/* Características destacadas */}
        <Animated.View 
          entering={FadeInUp.delay(900).duration(600)}
          style={styles.featuresContainer}
        >
          <View style={styles.featureItem}>
            <Ionicons name="calendar-outline" size={20} color="rgba(255,255,255,0.8)" />
            <Text style={styles.featureText}>Reserva fácil</Text>
          </View>
          <View style={styles.featureDivider} />
          <View style={styles.featureItem}>
            <Ionicons name="time-outline" size={20} color="rgba(255,255,255,0.8)" />
            <Text style={styles.featureText}>Ahorra tiempo</Text>
          </View>
          <View style={styles.featureDivider} />
          <View style={styles.featureItem}>
            <Ionicons name="star-outline" size={20} color="rgba(255,255,255,0.8)" />
            <Text style={styles.featureText}>Calidad</Text>
          </View>
        </Animated.View>

        {/* Botón de inicio */}
        <Animated.View 
          entering={FadeInUp.delay(1100).duration(600).springify()}
          style={styles.buttonContainer}
        >
          <TouchableOpacity style={styles.button} onPress={handleIniciar} activeOpacity={0.9}>
            <LinearGradient
              colors={['#ffffff', '#f0f0f0']}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>Comenzar</Text>
              <Ionicons name="arrow-forward" size={20} color="#0C553C" style={styles.buttonIcon} />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Footer */}
        <Animated.View 
          entering={FadeIn.delay(1400).duration(600)}
          style={styles.footer}
        >
          <Text style={styles.footerText}>Servicio profesional de lavado automotriz</Text>
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    zIndex: 1,
  },
  // Círculos decorativos
  decorativeCircle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    top: -100,
    right: -100,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    bottom: 100,
    left: -80,
  },
  decorativeCircle3: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    bottom: -50,
    right: 30,
  },
  // Logo
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  centerImage: {
    width: width * 0.55,
    height: height * 0.25,
    maxWidth: 280,
    maxHeight: 280,
  },
  // Texto de bienvenida
  welcomeContainer: {
    alignItems: 'center',
    marginBottom: 35,
  },
  welcomeText: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '300',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  appName: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 4,
    marginVertical: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginTop: 5,
  },
  // Características
  featuresContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 45,
    paddingHorizontal: 10,
  },
  featureItem: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  featureText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginTop: 6,
  },
  featureDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  // Botón
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 30,
  },
  button: {
    width: '85%',
    maxWidth: 300,
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 10,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 30,
  },
  buttonText: {
    color: '#0C553C',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  buttonIcon: {
    marginLeft: 10,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 40,
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    textAlign: 'center',
  },
});