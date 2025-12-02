import { StyleSheet, View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function SelectRoleScreen() {
  const router = useRouter();

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
    <View style={styles.container}>
      {/* Decorative circles for visual interest */}
      <View style={styles.decorativeCircle1} />
      <View style={styles.decorativeCircle2} />
      
      <View style={styles.contentWrapper}>
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.logo}
          contentFit="contain"
        />
        
        <Text style={styles.title}>¿Cómo quieres usar la app?</Text>
        <Text style={styles.subtitle}>Selecciona tu tipo de cuenta para continuar</Text>
        
        <View style={styles.optionsContainer}>
          <TouchableOpacity 
            style={styles.roleButton} 
            onPress={handleClientRole}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#1B7A52', '#165E40']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.roleGradient}
            >
              <View style={styles.roleContent}>
                <View style={styles.iconContainer}>
                  <Ionicons name="person" size={28} color="#fff" />
                </View>
                <Text style={styles.roleTitle}>Soy Cliente</Text>
                <Text style={styles.roleDescription}>
                  Busco Autolavados
                </Text>
                <View style={styles.arrowContainer}>
                  <Ionicons name="arrow-forward" size={18} color="rgba(255, 255, 255, 0.7)" />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.roleButton} 
            onPress={handleCompanyRole}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#1B7A52', '#165E40']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.roleGradient}
            >
              <View style={styles.roleContent}>
                <View style={styles.iconContainer}>
                  <MaterialIcons name="business" size={28} color="#fff" />
                </View>
                <Text style={styles.roleTitle}>Soy Empresa</Text>
                <Text style={styles.roleDescription}>
                  Ofrezco servicios de Autolavados
                </Text>
                <View style={styles.arrowContainer}>
                  <Ionicons name="arrow-forward" size={18} color="rgba(255, 255, 255, 0.7)" />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <View style={styles.backButtonContent}>
            <Ionicons name="arrow-back" size={18} color="#fff" style={styles.backIcon} />
            <Text style={styles.backButtonText}>Volver</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C553C',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(27, 122, 82, 0.15)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -80,
    left: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(27, 122, 82, 0.1)',
  },
  contentWrapper: {
    width: '100%',
    alignItems: 'center',
    zIndex: 1,
  },
  logo: {
    width: width * 0.35,
    height: width * 0.35,
    maxWidth: 180,
    maxHeight: 180,
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    marginBottom: 48,
    fontWeight: '400',
    letterSpacing: 0.2,
  },
  optionsContainer: {
    width: '100%',
    maxWidth: 380,
    gap: 16,
  },
  roleButton: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  roleGradient: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  roleContent: {
    padding: 20,
    alignItems: 'center',
    position: 'relative',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  roleTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  roleDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '400',
    paddingHorizontal: 8,
  },
  arrowContainer: {
    marginTop: 8,
    padding: 4,
  },
  backButton: {
    marginTop: 32,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  backButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    marginRight: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});