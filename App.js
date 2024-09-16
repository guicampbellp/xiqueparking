import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, Image, Alert } from 'react-native';
import { auth, db } from './src/firebaseConnection';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { FormUsers } from './src/FormUsers';

export default function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [modalVisible, setModalVisible] = useState(false);

  const [authUser, setAuthUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser({
          email: user.email,
          uid: user.uid
        });
        checkAdmin(user.uid); // Check if the user is an admin
        setLoading(false);
        return;
      }
      setAuthUser(null);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const checkAdmin = async (uid) => {
    try {
      const docRef = doc(db, "adm", "1"); // Get the admin document
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const adminData = docSnap.data();
        if (adminData.uid === uid && adminData.IsAdm) {
          Alert.alert("Acesso Administrativo", "Você é um administrador!");
        }
      }
    } catch (error) {
      console.error("Erro ao verificar administrador:", error);
    }
  };

  async function handleCreateUser() {
    if (!fullName || !birthDate || !email || !password || !confirmPassword) {
      Alert.alert("Erro", "Por favor, preencha todos os campos.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Erro", "As senhas não coincidem.");
      return;
    }

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      setModalVisible(false); // Close the modal on success
      setFullName("");
      setBirthDate("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Error creating user:", error);
      Alert.alert("Erro", "Erro ao criar conta. Verifique se o email já está em uso.");
    }
  }

  function handleLogin() {
    if (!email || !password) {
      Alert.alert("Erro", "Por favor, preencha todos os campos.");
      return;
    }

    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        setAuthUser({
          email: userCredential.user.email,
          uid: userCredential.user.uid
        });
      })
      .catch(err => {
        if (err.code === "auth/invalid-email") {
          Alert.alert("Erro", "Email inválido.");
        } else if (err.code === "auth/user-not-found") {
          Alert.alert("Erro", "Usuário não encontrado.");
        } else if (err.code === "auth/wrong-password") {
          Alert.alert("Erro", "Senha incorreta.");
        } else {
          Alert.alert("Erro", "Erro ao fazer login.");
        }
        console.error(err.code);
      });
  }

  async function handleLogout() {
    await signOut(auth);
    setAuthUser(null);
  }

  if (authUser) {
    return (
      <View style={styles.container}>
        <FormUsers />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {loading && <Text style={styles.loadingText}>Carregando informações...</Text>}

      <Image source={require('./assets/xique.png')} style={styles.logo} />
      <Text style={styles.logoText}>XiqueParking</Text>

      <Text style={styles.label}>Email:</Text>
      <TextInput
        style={styles.input}
        placeholder="Digite seu email..."
        value={email}
        onChangeText={(text) => setEmail(text)}
      />

      <Text style={styles.label}>Senha:</Text>
      <TextInput
        style={styles.input}
        placeholder="Digite sua senha..."
        value={password}
        onChangeText={(text) => setPassword(text)}
        secureTextEntry={true}
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Fazer login</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => setModalVisible(true)}>
        <Text style={styles.buttonText}>Criar uma conta</Text>
      </TouchableOpacity>

      {authUser && (
        <TouchableOpacity style={[styles.button, { backgroundColor: "red" }]} onPress={handleLogout}>
          <Text style={styles.buttonText}>Sair da conta</Text>
        </TouchableOpacity>
      )}

      {/* Modal para criar conta */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <Text style={styles.modalText}>Criar Conta</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Nome completo"
              value={fullName}
              onChangeText={(text) => setFullName(text)}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Data de nascimento (DD/MM/AAAA)"
              value={birthDate}
              onChangeText={(text) => setBirthDate(text)}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Email"
              value={email}
              onChangeText={(text) => setEmail(text)}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Senha"
              value={password}
              onChangeText={(text) => setPassword(text)}
              secureTextEntry={true}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Confirme a senha"
              value={confirmPassword}
              onChangeText={(text) => setConfirmPassword(text)}
              secureTextEntry={true}
            />

            <TouchableOpacity style={styles.button} onPress={handleCreateUser}>
              <Text style={styles.buttonText}>Criar Conta</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.button} onPress={() => setModalVisible(false)}>
              <Text style={styles.buttonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
    backgroundColor: "#FFA83F",
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 10,
    marginTop: 20,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  input: {
    width: '90%',
    borderWidth: 1,
    borderColor: '#fff',
    borderRadius: 5,
    padding: 10,
    marginBottom: 14,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: "#000",
    width: '90%',
    padding: 12,
    borderRadius: 5,
    marginBottom: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: "#FFF",
    fontSize: 16,
  },
  loadingText: {
    fontSize: 20,
    marginBottom: 20,
    color: "#fff",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalView: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalText: {
    marginBottom: 15,
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  modalInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 14,
  },
});
