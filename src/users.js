import { View, StyleSheet, Text, TouchableOpacity, Modal, Button, Image } from 'react-native';
import { useState, useEffect } from 'react';
import { db, auth } from './firebaseConnection';
import { deleteDoc, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { format } from 'date-fns'; // Para formatar a data

export function UsersList({ data, handleEdit, handleDelete }) {
  const user = auth.currentUser;
  const [modalVisible, setModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [hours, setHours] = useState(0);
  const [calculatedCost, setCalculatedCost] = useState(null);
  const [expirationTime, setExpirationTime] = useState(data.expirationTime || 0);
  const [receiptData, setReceiptData] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(''); // Estado para o método de pagamento

  useEffect(() => {
    const docRef = doc(db, "users", data.id);
    const unsubscribe = onSnapshot(docRef, (doc) => {
      const userData = doc.data();
      if (userData && userData.expirationTime) {
        setExpirationTime(userData.expirationTime);
        if (userData.receipt) {
          setReceiptData(userData.receipt);
        }
      }
    });

    return () => unsubscribe();
  }, [data.id]);

  useEffect(() => {
    const checkExpiration = () => {
      const currentTime = new Date().getTime();
      if (expirationTime > currentTime) {
        setTimeout(checkExpiration, 1000);
      } else {
        setExpirationTime(0);
      }
    };

    checkExpiration();

    return () => clearTimeout();
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
    if (!paymentMethod) {
      alert("Por favor, selecione um método de pagamento.");
      return;
    }

    const currentTime = new Date().getTime();
    const tempoEmMilissegundos = hours * 60 * 60 * 1000;
    const novoTempoExpiracao = currentTime + tempoEmMilissegundos;

    // Dados do comprovante
    const receipt = {
      modelo: data.modelo,
      marca: data.marca,
      placa: data.placa,
      carroceria: data.carroceria,
      eletrico: data.eletrico,
      custo: calculatedCost.toFixed(2),
      horaCompra: format(new Date(currentTime), 'dd/MM/yyyy HH:mm:ss'),
      horaSaida: format(new Date(novoTempoExpiracao), 'dd/MM/yyyy HH:mm:ss'),
      metodoPagamento: paymentMethod, // Inclui o método de pagamento
    };

    await updateDoc(doc(db, "users", data.id), {
      expirationTime: novoTempoExpiracao,
      receipt: receipt
    });

    setExpirationTime(novoTempoExpiracao);
    setReceiptData(receipt);
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

  const handleViewReceipt = () => {
    setReceiptModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.placa}>
        <View style={styles.placaCima}>
          <Image source={require('../assets/mercosul.png')} style={styles.bandeira} />
          <Text style={{ color: '#fff', fontWeight: 600, }}>BRASIL</Text>
          <Image source={require('../assets/br.png')} style={styles.bandeira} />
        </View>
        <Text style={{ color: '#000', fontWeight: 600, fontSize: 18, }}>{data.placa}</Text>
      </View>

      {expirationTime > new Date().getTime() && (
        <Text style={styles.item}>
          Tempo Restante: {formatarTempo(expirationTime - new Date().getTime())}
        </Text>
      )}

      <View style={styles.boxBotaoPlaca}>
        <TouchableOpacity
          style={[styles.buttonFrontDell, { opacity: expirationTime > new Date().getTime() ? 0.5 : 1 }]}
          onPress={expirationTime <= new Date().getTime() ? handleDeleteItem : null}
          disabled={expirationTime > new Date().getTime()}
        >
          <Text style={styles.buttonText}>Deletar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.buttonFrontEdit, { opacity: expirationTime > new Date().getTime() ? 0.5 : 1 }]}
          onPress={expirationTime <= new Date().getTime() ? handleEditUser : null}
          disabled={expirationTime > new Date().getTime()}
        >
          <Text style={styles.buttonText}>Editar</Text>
        </TouchableOpacity>
      </View>
      

      <TouchableOpacity
        style={[styles.buttonUsePlaca, { opacity: expirationTime > new Date().getTime() ? 0.5 : 1 }]}
        onPress={expirationTime <= new Date().getTime() ? () => setModalVisible(true) : null}
        disabled={expirationTime > new Date().getTime()}
      >
        <Text style={styles.buttonText}>Alugar Vaga</Text>
      </TouchableOpacity>

      {expirationTime > new Date().getTime() && (
        <TouchableOpacity
          style={styles.button}
          onPress={handleViewReceipt}
        >
          <Text style={styles.buttonText}>Comprovante</Text>
        </TouchableOpacity>
      )}

      {/* Modal para calcular e comprar */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(!modalVisible);
          setCalculatedCost(null);
          setHours(0);
        }}
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

          <Button title="Fechar" onPress={() => {
            setModalVisible(!modalVisible);
            setCalculatedCost(null);
            setHours(0);
          }} />
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

          {/* Botões para selecionar o método de pagamento */}
          <View style={styles.paymentOptions}>
            <TouchableOpacity
              style={[styles.paymentButton, paymentMethod === 'Cartão de crédito' && styles.selectedPayment]}
              onPress={() => setPaymentMethod('Cartão de crédito')}
            >
              <Text style={styles.paymentButtonText}>Cartão de Crédito</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.paymentButton, paymentMethod === 'Pix' && styles.selectedPayment]}
              onPress={() => setPaymentMethod('Pix')}
            >
              <Text style={styles.paymentButtonText}>Pix</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.paymentButton, paymentMethod === 'Cartão de débito' && styles.selectedPayment]}
              onPress={() => setPaymentMethod('Cartão de débito')}
            >
              <Text style={styles.paymentButtonText}>Cartão de Débito</Text>
            </TouchableOpacity>
          </View>

          <Button 
            title="Confirmar Pagamento" 
            onPress={handleConfirmPayment} 
            disabled={!paymentMethod} // Desabilita se nenhum método estiver selecionado
          />

          <Button title="Fechar" onPress={() => setPaymentModalVisible(false)} />
        </View>
      </Modal>

      {/* Modal para comprovante */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={receiptModalVisible}
        onRequestClose={() => setReceiptModalVisible(!receiptModalVisible)}
      >
        <View style={styles.modalView}>
          <Text style={styles.comprovTitulo}>Comprovante de Aluguel</Text>
          {receiptData ? (
            <>
              <Text style={styles.comprovText}>Modelo: {receiptData.modelo}</Text>
              <Text style={styles.comprovText}>Marca: {receiptData.marca}</Text>
              <Text style={styles.comprovText}>Placa: {receiptData.placa}</Text>
              <Text style={styles.comprovText}>Carroceria: {receiptData.carroceria}</Text>
              <Text style={styles.comprovText}>Elétrico: {receiptData.eletrico}</Text>
              <Text style={styles.comprovText}>Custo: R$ {receiptData.custo}</Text>
              <Text style={styles.comprovText}>Hora da Compra: {receiptData.horaCompra}</Text>
              <Text style={styles.comprovText}>Hora de Saída: {receiptData.horaSaida}</Text>
              <Text style={styles.comprovText}>Método de Pagamento: {receiptData.metodoPagamento}</Text>
            </>
          ) : (
            <Text style={styles.comprovText}>Nenhum comprovante disponível.</Text>
          )}
          <TouchableOpacity style={styles.button} title="Fechar" onPress={() => setReceiptModalVisible(false)}>
            <Text style={styles.buttonText}>Fechar</Text>
          </TouchableOpacity>
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
    backgroundColor: "#fff",
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: {width: 2, height: 5},
    shadowOpacity: 10,
    shadowRadius: 4,
    elevation: 3,
    width: 300,
  },
  btnCarro: {
    width: 70,
    height: 70,
    borderRadius: '50%',
    fontSize: 19,
    fontWeight: 600,
  },
  item: {
    color: "#000",
    fontSize: 16,
  },
  buttonFront: {
    backgroundColor: "#f28705",
    alignSelf: "center",
    paddingTop: 10,
    paddingLeft: 20,
    paddingBottom: 10,
    paddingRight: 20,
    borderRadius: 4,
    marginTop: 25,
  },
  buttonUsePlaca: {
    backgroundColor: "#0037a8",
    alignSelf: "center",
    paddingTop: 10,
    paddingLeft: 20,
    paddingBottom: 10,
    paddingRight: 20,
    borderRadius: 4,
    marginTop: 25,
    width: '90%',
  },
  buttonText: {
    color: "#fff",
    paddingLeft: 8,
    paddingRight: 8,
    textAlign: 'center',
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
    flex: 1,
    alignItems: 'flex-start',
    margin: 20,
    backgroundColor: "white",
    borderRadius: 10,
    padding: 35,
    alignItems: "baseline",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  comprovText: {
    marginTop: 15,
  },  
  comprovTitulo :{
    fontSize: 20,
    color: '#261419',
    marginBottom: 20,
  },
  fecharComprov: {
    width: '90%',
  },
  modalText: {
    marginBottom: 15,
    marginTop: 15,
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
  paymentOptions: {
    marginTop: 20,
    width: '100%',
  },
  paymentButton: {
    backgroundColor: '#e0e0e0',
    padding: 10,
    borderRadius: 5,
    marginVertical: 5,
    alignItems: 'center',
  },
  paymentButtonText: {
    fontSize: 16,
  },
  selectedPayment: {
    backgroundColor: '#007BFF',
    color: '#FFF',
  },
  placa: {
    width: 200,
    height: 55,
    alignItems: 'center',
    borderColor: '#000',
    borderWidth: 2,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  placaCima: {
    backgroundColor: '#0037a8',
    width: '100%',
    paddingTop: 2,
    paddingRight: 3,
    paddingLeft: 3,
    paddingBottom: 2,
    alignItems: 'center',
    justifyContent: 'space-between',
    color: 'white',
    display: 'flex',
    flexDirection: 'row',

  },
  bandeira: {
    width: 30,
    height: 20,
    borderRadius: 2,
  },
  boxBotaoPlaca: {
    display: 'flex',
    flexDirection: 'row',
  },
  buttonFrontDell: {
    backgroundColor: "#c20e0e",
    alignSelf: "center",
    paddingTop: 10,
    paddingLeft: 20,
    paddingBottom: 10,
    paddingRight: 20,
    borderRadius: 4,
    marginTop: 25,
    marginRight: 25,
    width: '40%',
  },
  buttonFrontEdit: {
    backgroundColor: "#f28705",
    alignSelf: "center",
    paddingTop: 10,
    paddingLeft: 20,
    paddingBottom: 10,
    paddingRight: 20,
    borderRadius: 4,
    marginTop: 25,
    width: '40%',
  }
});