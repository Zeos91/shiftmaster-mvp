import React, { useEffect, useState } from "react";
import { View, Text, Button } from "react-native";
import axios from "axios";

const API_URL = "https://upgraded-space-telegram-9j6wvxxxp42xvpj-3000.app.github.dev/";

export default function App() {
  const [shifts, setShifts] = useState<any[]>([]);
  
  const createShift = async () => {
    await axios.post(`${API_URL}api/shifts`, {
      operatorId: "op-1",
      date: new Date(),
      hours: 8
    });
    fetchShifts();
  };

  const fetchShifts = async () => {
    const res = await axios.get(`${API_URL}api/shifts`);
    setShifts(res.data);
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  return (
    <View style={{ padding: 40 }}>
      <Button title="Create Shift" onPress={createShift} />
      {shifts.map(s => (
        <Text key={s.id}>{s.operatorId} - {s.hours}h</Text>
      ))}
    </View>
  );
}
