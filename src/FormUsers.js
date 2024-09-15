import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, ActivityIndicator } from 'react-native';
import { db, auth } from './firebaseConnection';
import { doc, onSnapshot, addDoc, updateDoc, deleteDoc, collection, query, where } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { UsersList } from './users';
import { Picker } from '@react-native-picker/picker';
import CheckBox from '@react-native-community/checkbox';

export function FormUsers() {
  const [modelo, setModelo] = useState("");
  const [marca, setMarca] = useState("");
  const [placa, setPlaca] = useState("");
  const [carroceria, setCarroceria] = useState("");
  const [eletrico, setEletrico] = useState(false);

  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false); // Inicialmente o formulário está oculto
  const [isEditing, setIsEditing] = useState("");
  const [loading, setLoading] = useState(false); // Estado de carregamento

  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;

    async function getDados() {
      setLoading(true);
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("uid", "==", user.uid));
      onSnapshot(q, (snapshot) => {
        let lista = [];
        snapshot.forEach((doc) => {
          lista.push({
            id: doc.id,
            modelo: doc.data().modelo,
            marca: doc.data().marca,
            placa: doc.data().placa,
            carroceria: doc.data().carroceria,
            eletrico: doc.data().eletrico
          });
        });
        setUsers(lista);
        setLoading(false);
      });
    }

    getDados();
  }, [user]);

  function resetForm() {
    setModelo("");
    setMarca("");
    setPlaca("");
    setCarroceria("");
    setEletrico(false);
  }

  function isFormFilled() {
    return modelo && marca && placa && carroceria; // Verifica se todos os campos estão preenchidos
  }

  async function handleRegister() {
    if (!user) return;
    if (!isFormFilled()) {
      alert("Por favor, preencha todos os campos.");
      return;
    }
    
    setLoading(true);
    await addDoc(collection(db, "users"), {
      modelo: modelo,
      marca: marca,
      placa: placa,
      carroceria: carroceria,
      eletrico: eletrico ? "Sim" : "Não",
      uid: user.uid
    })
    .then(() => {
      console.log("CADASTRADO COM SUCESSO");
      resetForm();
      setShowForm(false); // Fecha o formulário após adicionar o carro
    })
    .catch((err) => {
      console.log(err);
    })
    .finally(() => {
      setLoading(false);
    });
  }

  async function handleEditUser() {
    if (!isEditing) return;
    if (!isFormFilled()) {
      alert("Por favor, preencha todos os campos.");
      return;
    }
    
    setLoading(true);
    const docRef = doc(db, "users", isEditing);
    await updateDoc(docRef, {
      modelo: modelo,
      marca: marca,
      placa: placa,
      carroceria: carroceria,
      eletrico: eletrico ? "Sim" : "Não"
    });

    resetForm();
    setIsEditing("");
    setShowForm(false); // Fecha o formulário após editar o carro
    setLoading(false); // Termina a animação de carregamento
  }

  async function handleDeleteUser(id) {
    setLoading(true);
    const docRef = doc(db, "users", id);
    await deleteDoc(docRef);
    resetForm();
    setLoading(false); // Termina a animação de carregamento
  }

  async function handleLogout() {
    setLoading(true);
    await signOut(auth);
    setLoading(false); // Termina a animação de carregamento
  } 

  function editUser(data) {
    setModelo(data.modelo);
    setMarca(data.marca);
    setPlaca(data.placa);
    setCarroceria(data.carroceria);
    setEletrico(data.eletrico === "Sim");
    setIsEditing(data.id);
    setShowForm(true); // Exibe o formulário quando um item é editado
  }

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      )}

      {!showForm && !loading && (
        <TouchableOpacity onPress={() => setShowForm(true)} style={styles.button}>
          <Text style={styles.buttonText}>Cadastrar Carro</Text>
        </TouchableOpacity>
      )}

      {showForm && (
        <View>
          <Text style={styles.label}>Modelo:</Text>
          <TextInput
            style={styles.input}
            placeholder="Digite o modelo do carro..."
            value={modelo}
            onChangeText={(text) => setModelo(text)} 
          />

          <Text style={styles.label}>Marca:</Text>
          <TextInput
            style={styles.input}
            placeholder="Digite a marca do carro..."
            value={marca}
            onChangeText={(text) => setMarca(text)} 
          />

          <Text style={styles.label}>Placa:</Text>
          <TextInput
            style={styles.input}
            placeholder="Digite a placa do carro..."
            value={placa}
            onChangeText={(text) => setPlaca(text)} 
          />

          <Text style={styles.label}>Carroceria:</Text>
          <Picker
            selectedValue={carroceria}
            onValueChange={(itemValue) => setCarroceria(itemValue)}
            style={styles.picker}
          >
            <Picker.Item label="Sub Compacto" value="Sub Compacto" />
            <Picker.Item label="Compacto" value="Compacto" />
            <Picker.Item label="Hatch" value="Hatch" />
            <Picker.Item label="SUV" value="SUV" />
            <Picker.Item label="Sedan" value="Sedan" />
            <Picker.Item label="Pickup" value="Pickup" />
          </Picker>

          <Text style={styles.label}>Elétrico:</Text>
          <View style={styles.checkboxContainer}>
            <CheckBox
              value={eletrico}
              onValueChange={(newValue) => setEletrico(newValue)}
              style={styles.checkbox}
            />
            <Text style={styles.checkboxLabel}>Sim</Text>
          </View>

          {isEditing !== "" ? (
            <TouchableOpacity style={styles.button} onPress={handleEditUser}>
              <Text style={styles.buttonText}>Editar carro</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.button} onPress={handleRegister}>
              <Text style={styles.buttonText}>Adicionar</Text>
            </TouchableOpacity>
          )}

          {/* Botão para limpar o formulário, aparece apenas se o formulário estiver preenchido */}
          {isFormFilled() && (
            <TouchableOpacity style={styles.buttonClear} onPress={resetForm}>
              <Text style={styles.buttonText}>Limpar Formulário</Text>
            </TouchableOpacity>
          )}

          {/* Botão para fechar o formulário */}
          <TouchableOpacity onPress={() => setShowForm(false)} style={styles.button}>
            <Text style={styles.buttonText}>Fechar formulário</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && (
        <>
          <Text style={{ marginTop: 14, marginLeft: 8, fontSize: 20, color: "#000" }}>
            Carros:
          </Text>

          <FlatList
            style={styles.list}
            data={users}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <UsersList
                data={item}
                handleEdit={(item) => editUser(item)}
                handleDelete={(id) => handleDeleteUser(id)}
              />
            )}
          />

          <TouchableOpacity onPress={handleLogout} style={styles.buttonLogout}>
            <Text style={{ color: "#FFF" }}>Sair da conta</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, 
  },
  button: {
    backgroundColor: "#000",
    marginLeft: 8,
    marginRight: 8,
    marginTop: 8,
    borderRadius: 4,
    padding: 10,
  },
  buttonClear: {
    backgroundColor: "#6c757d",
    marginLeft: 8,
    marginRight: 8,
    marginTop: 8,
    borderRadius: 4,
    padding: 10,
  },
  buttonText: {
    color: "#FFF",
    textAlign: "center",
    fontSize: 16,
  },
  label: {
    fontSize: 16,
    marginLeft: 8,
    marginBottom: 4,
  },
  input: {
    height: 40,
    borderColor: "#000",
    borderWidth: 1,
    borderRadius: 4,
    marginLeft: 8,
    marginRight: 8,
    marginBottom: 8,
    padding: 8,
  },
  picker: {
    marginLeft: 8,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#000",
    borderRadius: 4,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
    marginBottom: 8,
  },
  checkbox: {
    marginRight: 8,
  },
  checkboxLabel: {
    fontSize: 16,
  },
  list: {
    marginTop: 10,
  },
  buttonLogout: {
    backgroundColor: "#dc3545",
    marginTop: 8,
    marginLeft: 8,
    marginRight: 8,
    borderRadius: 4,
    padding: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.2)',
  }
});
