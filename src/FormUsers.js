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
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState("");
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [carDetails, setCarDetails] = useState([]);

  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;

    async function checkAdmin() {
      const admRef = collection(db, "adm");
      const q = query(admRef, where("uid", "==", user.uid));
      onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          snapshot.forEach((doc) => {
            const data = doc.data();
            setIsAdmin(data.IsAdm);
          });
        }
      });
    }

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
            eletrico: doc.data().eletrico,
            expirationTime: doc.data().expirationTime // Adicionando expirationTime aqui
          });
        });
        setUsers(lista);
        setLoading(false);
      });
    }

    checkAdmin();
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
      uid: user.uid,

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

  async function handleSearch() {
    setLoading(true);
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("placa", "==", searchQuery));
    onSnapshot(q, (snapshot) => {
      let lista = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const currentTime = new Date().getTime();
        const expirationTime = data.expirationTime || 0;
        const remainingTime = expirationTime - currentTime;
        lista.push({
          id: doc.id,
          modelo: data.modelo,
          marca: data.marca,
          placa: data.placa,
          carroceria: data.carroceria,
          eletrico: data.eletrico,
          expirationTime: data.expirationTime,
          remainingTime
        });
      });
      setCarDetails(lista);
      setLoading(false);
    });
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

  const formatRemainingTime = (remainingTime) => {
    const totalSegundos = Math.floor(remainingTime / 1000);
    const horas = Math.floor(totalSegundos / 3600);
    const minutos = Math.floor((totalSegundos % 3600) / 60);
    const segundos = totalSegundos % 60;
    return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      )}

      {isAdmin && (
        <View>
          <Text style={styles.label}>Pesquisar Placa:</Text>
          <TextInput
            style={styles.input}
            placeholder="Digite a placa do carro..."
            value={searchQuery}
            onChangeText={(text) => setSearchQuery(text)}
          />
          <TouchableOpacity style={styles.button} onPress={handleSearch}>
            <Text style={styles.buttonText}>Pesquisar</Text>
          </TouchableOpacity>

          {carDetails.length > 0 && (
            <FlatList
              data={carDetails}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <View style={styles.item}>
                  <Text>{`Modelo: ${item.modelo}`}</Text>
                  <Text>{`Marca: ${item.marca}`}</Text>
                  <Text>{`Placa: ${item.placa}`}</Text>
                  <Text>{`Carroceria: ${item.carroceria}`}</Text>
                  <Text>{`Elétrico: ${item.eletrico}`}</Text>
                  {item.remainingTime > 0 ? (
                    <Text>{`Tempo Restante: ${formatRemainingTime(item.remainingTime)}`}</Text>
                  ) : (
                    <Text>Este carro não está mais alugado.</Text>
                  )}
                </View>
              )}
            />
          )}
        </View>
      )}

      {!showForm && !loading && !isAdmin && (
        <TouchableOpacity onPress={() => setShowForm(true)} style={styles.button}>
          <Text style={styles.buttonText}>Cadastrar Carro</Text>
        </TouchableOpacity>
      )}

      {showForm && !isAdmin && (
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

          {isFormFilled() && (
            <TouchableOpacity style={styles.buttonClear} onPress={resetForm}>
              <Text style={styles.buttonText}>Limpar Formulário</Text>
            </TouchableOpacity>
          )}

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
        </>
      )}

      {/* Botão de Logout fixo na parte inferior */}
      <View style={styles.logoutContainer}>
        <TouchableOpacity style={styles.buttonLogout} onPress={handleLogout}>
          <Text style={styles.buttonText}>Sair</Text>
        </TouchableOpacity>
      </View>
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
    borderRadius: 4,
    padding: 10,
  },
  logoutContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ccc',
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
  },
  item: {
    padding: 10,
    borderBottomColor: '#ccc',
    borderBottomWidth: 1,
  }
});
