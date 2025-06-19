fetch("./data/names.json")
  .then((response) => response.json())
  .then((data) => {
    console.log(data.names); // ["田浩", "陈莹"]
  })
  .catch((error) => {
    console.error("获取数据失败:", error);
  });
