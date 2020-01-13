import React from "react";
import "./App.css";
import "@progress/kendo-theme-default/dist/all.css";
import { Chat } from "@progress/kendo-react-conversational-ui";
import { StreamChat } from "stream-chat";

class App extends React.Component {
  constructor(props) {
    super(props);
    this.user = undefined;
    this.bot = { id: "0", name: "bot" };

    this.state = {
      messages: [
        {
          author: this.bot,
          timestamp: new Date(),
          text: "Hello! Please enter a name in order to start a chat"
        }
      ]
    };
  }

  initialiseChatClient = async () => {
    const response = await fetch("http://localhost:8080/v1/token", {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        id: this.user.id,
        name: this.user.name
      })
    });
    const streamServerInfo = await response.json();

    this.chatClient = new StreamChat(streamServerInfo.apiKey);
    this.chatClient.setUser(this.user, streamServerInfo.token);

    this.conversation = this.chatClient.channel(
      "commerce",
      "conversational-ui"
    );

    await this.conversation.watch();
    this.conversation.on("message.new", this.onNewMessage);
  };

  addMessage = ({ message }) => {
    if (!this.user) {
      this.user = { name: message.text, id: Date.now().toString() };

      let newMessage = Object.assign({}, message);
      newMessage.text = `Welcome to the chat ${message.text}!`;
      newMessage.author = this.bot;

      this.setState({
        messages: [...this.state.messages, newMessage]
      });

      this.initialiseChatClient();
    } else {
      this.conversation.sendMessage({ text: message.text });
    }
  };

  onNewMessage = event => {
    let message = {
      text: event.message.text,
      author: event.message.user,
      timestamp: event.message.created_at
    };

    this.setState({
      messages: [...this.state.messages, message]
    });

    if (message.author.id !== this.user.id) this.createNotification(message);
  };

  createNotification(message) {
    return new Notification(`${message.author.name} sent a message`, {
      body: message.text
    });
  }

  componentDidMount() {
    this.askNotificationPermission();
  }

  askNotificationPermission = async () => {
    // Let's check if the browser supports notifications
    if ("Notification" in window) {
      if (this.checkNotificationPromise()) {
        const permission = await Notification.requestPermission();
        this.handlePermission(permission);
      } else {
        Notification.requestPermission(permission => {
          this.handlePermission(permission);
        });
      }
    } else {
      console.log("This browser does not support notifications.");
    }
  };

  handlePermission = permission => {
    // Whatever the user answers, we make sure Chrome stores the information. This is because some old versions of chrome didn't set this automatically
    if (!("permission" in Notification)) {
      Notification.permission = permission;
    }
  };

  // Function to check whether browser supports the promise version of requestPermission()
  // Safari only supports the old callback-based version
  checkNotificationPromise() {
    try {
      Notification.requestPermission().then();
    } catch (e) {
      return false;
    }

    return true;
  }

  render() {
    return (
      <div className="App">
        <h1>Conversational UI</h1>
        <Chat
          user={this.user}
          messages={this.state.messages}
          onMessageSend={this.addMessage}
          placeholder={"Type here..."}
          width={400}
        ></Chat>
      </div>
    );
  }
}

export default App;
