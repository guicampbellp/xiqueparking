import { View, StyleSheet, Text, TouchableOpacity, Modal, Button } from 'react-native';
import { useState, useEffect } from 'react';
import { db, auth } from './firebaseConnection';
import { deleteDoc, doc, updateDoc, onSnapshot } from 'firebase/firestore';

export function UsersList({ data, handleEdit, handleDelete }) {
  const user = auth.currentUser;
  const [modalVisible, setModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [hours, setHours] = useState(0);
  const [calculatedCost, setCalculatedCost] = useState(null);
  const [expirationTime, setExpirationTime] = useState(data.expirationTime || 0);

  useEffect(() => {
    const docRef = doc(db, "users", data.id);
    const unsubscribe = onSnapshot(docRef, (doc) => {
      const userData = doc.data();
      if (userData && userData.expirationTime) {
        setExpirationTime(userData.expirationTime);
      }
    });

    return () => unsubscribe();
  }, [data.id]);

  useEffect(() => {
    let intervalId;
    const checkExpiration = () => {
      const currentTime = new Date().getTime();
      if (expirationTime > currentTime) {
        setTimeout(checkExpiration, 1000);
      } else {
        setExpirationTime(0);
      }
    };

    checkExpiration();

    return () => clearInterval(intervalId);
  }, [expirationTime]);

  const calculateCost = (carroceria, eletrico, hours) => {
    const firstHourCosts = {
      "Sub Compacto": 2,
      "Compacto": 3,
      "Hatch": 5,
      "SUV": 5,
      "Sedan": 5,
      "Pickup": 7,
    };

    const firstHourCost = firstHourCosts[carroceria] || 0;
    const discountedFirstHourCost = eletrico === "Sim" ? firstHourCost / 2 : firstHourCost;
    const additionalHourCost = 2;

    const totalCost = hours > 1
      ? discountedFirstHourCost + (hours - 1) * additionalHourCost
      : discountedFirstHourCost;

    return totalCost;
  };

  const handleCalculateCost = () => {
    if (hours <= 0) {
      alert("Por favor, insira um número de horas válido.");
      return;
    }
    const cost = calculateCost(data.carroceria, data.eletrico, hours);
    setCalculatedCost(cost);
  };

  const handlePurchase = () => {
    if (hours <= 0) {
      alert("Por favor, insira um número de horas válido.");
      return;
    }
    setPaymentModalVisible(true);
  };

  const handleConfirmPayment = async () => {
    const currentTime = new Date().getTime();
    const tempoEmMilissegundos = hours * 60 * 60 * 1000;
    const novoTempoExpiracao = currentTime + tempoEmMilissegundos;

    await updateDoc(doc(db, "users", data.id), {
      expirationTime: novoTempoExpiracao
    });

    setExpirationTime(novoTempoExpiracao);
    setPaymentModalVisible(false);
    setModalVisible(false);
  };

  const handleDeleteItem = async () => {
    const docRef = doc(db, "users", data.id);
    await deleteDoc(docRef);
  };

  const handleEditUser = () => {
    handleEdit(data);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.item}>Modelo: {data.modelo}</Text>
      <Text style={styles.item}>Marca: {data.marca}</Text>
      <Text style={styles.item}>Placa: {data.placa}</Text>
      <Text style={styles.item}>Carroceria: {data.carroceria}</Text>
      <Text style={styles.item}>Elétrico: {data.eletrico}</Text>

      {expirationTime > new Date().getTime() && (
        <Text style={styles.item}>
          Tempo Restante: {formatarTempo(expirationTime - new Date().getTime())}
        </Text>
      )}

      <TouchableOpacity
        style={[styles.button, { opacity: expirationTime > new Date().getTime() ? 0.5 : 1 }]}
        onPress={expirationTime <= new Date().getTime() ? handleDeleteItem : null}
        disabled={expirationTime > new Date().getTime()}
      >
        <Text style={styles.buttonText}>Deletar carro</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.buttonEdit, { opacity: expirationTime > new Date().getTime() ? 0.5 : 1 }]}
        onPress={expirationTime <= new Date().getTime() ? handleEditUser : null}
        disabled={expirationTime > new Date().getTime()}
      >
        <Text style={styles.buttonText}>Editar carro</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.buttonUse, { opacity: expirationTime > new Date().getTime() ? 0.5 : 1 }]}
        onPress={expirationTime <= new Date().getTime() ? () => setModalVisible(true) : null}
        disabled={expirationTime > new Date().getTime()}
      >
        <Text style={styles.buttonText}>Usar essa placa</Text>
      </TouchableOpacity>

      {/* Modal para calcular e comprar */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(!modalVisible)}
      >
        <View style={styles.modalView}>
          <Text style={styles.modalText}>Quantas horas deseja estacionar?</Text>

          {/* Controle de horas com botões + e - */}
          <View style={styles.hourControl}>
            <TouchableOpacity style={styles.hourButton} onPress={() => setHours(prev => Math.max(prev - 1, 0))}>
              <Text style={styles.buttonText}>-</Text>
            </TouchableOpacity>

            <Text style={styles.hourDisplay}>{hours}</Text>

            <TouchableOpacity style={styles.hourButton} onPress={() => setHours(prev => prev + 1)}>
              <Text style={styles.buttonText}>+</Text>
            </TouchableOpacity>
          </View>

          <Button title="Calcular Custo" onPress={handleCalculateCost} />

          {calculatedCost !== null && (
            <>
              <Text style={styles.result}>Custo total: R$ {calculatedCost.toFixed(2)}</Text>
              <Button title="Comprar" onPress={handlePurchase} />
            </>
          )}

          <Button
            title="Fechar"
            onPress={() => {
              setModalVisible(!modalVisible);
              setCalculatedCost(null);
              setHours(0);
            }}
          />
        </View>
      </Modal>

      {/* Modal para pagamento */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={paymentModalVisible}
        onRequestClose={() => setPaymentModalVisible(!paymentModalVisible)}
      >
        <View style={styles.modalView}>
          <Text style={styles.modalText}>Confirme o pagamento</Text>
          <Text>Modelo: {data.modelo}</Text>
          <Text>Marca: {data.marca}</Text>
          <Text>Placa: {data.placa}</Text>
          <Text>Carroceria: {data.carroceria}</Text>
          <Text>Elétrico: {data.eletrico}</Text>
          <Text>Total: R$ {calculatedCost?.toFixed(2)}</Text>

          <Button title="Confirmar Pagamento" onPress={handleConfirmPayment} />

          <Button title="Fechar" onPress={() => setPaymentModalVisible(false)} />
        </View>
      </Modal>
    </View>
  );
}

const formatarTempo = (tempoRestante) => {
  const totalSegundos = Math.floor(tempoRestante / 1000);
  const horas = Math.floor(totalSegundos / 3600);
  const minutos = Math.floor((totalSegundos % 3600) / 60);
  const segundos = totalSegundos % 60;
  return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f0f0f0",
    padding: 8,
    borderRadius: 4,
    marginBottom: 14,
  },
  item: {
    color: "#000",
    fontSize: 16,
  },
  button: {
    backgroundColor: "#B3261E",
    alignSelf: "flex-start",
    padding: 4,
    borderRadius: 4,
    marginTop: 16,
  },
  buttonText: {
    color: "#FFF",
    paddingLeft: 8,
    paddingRight: 8,
  },
  buttonEdit: {
    backgroundColor: "#000",
    alignSelf: "flex-start",
    padding: 4,
    borderRadius: 4,
    marginTop: 16,
  },
  buttonUse: {
    backgroundColor: "#007BFF",
    alignSelf: "flex-start",
    padding: 4,
    borderRadius: 4,
    marginTop: 16,
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 10,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalText: {
    marginBottom: 15,
    textAlign: "center",
  },
  hourControl: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },
  hourButton: {
    backgroundColor: "#007BFF",
    padding: 10,
    borderRadius: 5,
  },
  hourDisplay: {
    marginHorizontal: 20,
    fontSize: 24,
  },
  result: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "bold",
  },
});
